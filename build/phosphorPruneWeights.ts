import type { Plugin } from 'vite';

/**
 * Strip unused Phosphor icon weights at build time.
 *
 * Every `@phosphor-icons/react/dist/defs/<Name>.es.js` module exports a Map of
 * SIX pre-built React elements — one per weight (thin, light, regular, bold,
 * fill, duotone) — and `duotone` alone carries two paths. The app only ever
 * renders three of them:
 *
 *   • `regular` — the global default set by <IconProvider>
 *   • `fill`    — what `makeIcon` switches to for a truthy `fill` prop
 *   • `bold`    — one explicit call site (PrayerTimes' ChevronDown)
 *
 * The other three were pure dead weight, and because the icon barrel is
 * reachable from nearly every route they shipped on first load: the icons
 * chunk was 567 kB / 128 kB gzip.
 *
 * The transform is a bracket-matching scan over the `new Map([...])`
 * initialiser, not a regex over SVG path data. If the module does not match
 * the expected shape — e.g. after a Phosphor major upgrade — the original
 * source is returned untouched and a warning is logged, so a dependency bump
 * can never silently produce blank icons.
 */

/** Weights the app can actually render. Keep in sync with src/lib/icons.tsx. */
export const KEPT_WEIGHTS = ['regular', 'fill', 'bold'] as const;

const DEF_MODULE = /@phosphor-icons[\\/]react[\\/]dist[\\/]defs[\\/][A-Za-z0-9]+\.es\.js$/;

interface PruneStats {
  files: number;
  bytesBefore: number;
  bytesAfter: number;
  skipped: string[];
}

/**
 * Split the top-level `[...]` entries of an array literal body.
 * Returns null when brackets are unbalanced or a string is left unterminated.
 */
function splitTopLevelEntries(body: string): string[] | null {
  const entries: string[] = [];
  let depth = 0;
  let entryStart = -1;
  let quote: string | null = null;

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];

    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '[' || ch === '(' || ch === '{') {
      if (depth === 0 && ch === '[') entryStart = i;
      depth += 1;
    } else if (ch === ']' || ch === ')' || ch === '}') {
      depth -= 1;
      if (depth < 0) return null;
      if (depth === 0 && ch === ']' && entryStart !== -1) {
        entries.push(body.slice(entryStart, i + 1));
        entryStart = -1;
      }
    }
  }

  return depth === 0 && quote === null ? entries : null;
}

function weightOf(entry: string): string | null {
  return /^\[\s*(?:\/\*[^*]*\*\/\s*)?"([a-z]+)"/.exec(entry)?.[1] ?? null;
}

export function phosphorPruneWeights(): Plugin {
  const kept = new Set<string>(KEPT_WEIGHTS);
  const stats: PruneStats = { files: 0, bytesBefore: 0, bytesAfter: 0, skipped: [] };

  return {
    name: 'phosphor-prune-weights',
    apply: 'build',
    enforce: 'pre',

    transform(code, id) {
      if (!DEF_MODULE.test(id)) return null;

      const open = code.indexOf('new Map([');
      if (open === -1) {
        stats.skipped.push(id);
        return null;
      }
      const bodyStart = open + 'new Map(['.length;

      // Find the matching `])` that closes the Map argument.
      const rest = code.slice(bodyStart);
      const entries = (() => {
        // The array body ends at the last `]` before the closing `)` of Map(.
        const closeIdx = rest.lastIndexOf(']');
        if (closeIdx === -1) return null;
        const parsed = splitTopLevelEntries(rest.slice(0, closeIdx));
        return parsed ? { parsed, closeIdx } : null;
      })();

      if (!entries || entries.parsed.length === 0) {
        stats.skipped.push(id);
        return null;
      }

      const weights = entries.parsed.map(weightOf);
      if (weights.some((w) => w === null)) {
        stats.skipped.push(id);
        return null;
      }
      // Refuse to touch a module that does not expose the weight we rely on.
      if (!weights.includes('regular')) {
        stats.skipped.push(id);
        return null;
      }

      const survivors = entries.parsed.filter((_, i) => kept.has(weights[i] as string));
      if (survivors.length === entries.parsed.length) return null;

      const next =
        code.slice(0, bodyStart) +
        '\n  ' +
        survivors.join(',\n  ') +
        '\n' +
        rest.slice(entries.closeIdx);

      stats.files += 1;
      stats.bytesBefore += code.length;
      stats.bytesAfter += next.length;

      return { code: next, map: null };
    },

    buildEnd() {
      if (stats.files > 0) {
        const saved = stats.bytesBefore - stats.bytesAfter;
        const pct = ((saved / stats.bytesBefore) * 100).toFixed(0);
        this.info(
          `pruned ${6 - kept.size} unused weights from ${stats.files} Phosphor glyphs ` +
            `— ${(saved / 1024).toFixed(0)} kB of source removed (${pct}%)`,
        );
      }
      if (stats.skipped.length > 0) {
        this.warn(
          `could not prune ${stats.skipped.length} Phosphor glyph module(s); ` +
            'the def format changed — icons still render, but all six weights ship. ' +
            `First: ${stats.skipped[0]}`,
        );
      }
    },
  };
}
