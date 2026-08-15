/**
 * AppTileVisuals — the portal's per-app identity layer.
 *
 * Every launcher tile used to share the same editorial costume (crop marks,
 * fake barcode, "EST. 2024", an SVG noise filter instantiated once per tile).
 * That read as noise and cost a filter graph per card without making any two
 * apps look meaningfully different.
 *
 * The identity of an app is now exactly three things:
 *   1. `accent` — an HSL triplet exposed as the `--tile` custom property, so
 *      every colour inside the tile derives from one dynamic token instead of
 *      hardcoded utilities.
 *   2. `motif`  — a quiet, app-specific line drawing (mushaf rules, a
 *      waveform, contour lines, a board grid …) sitting at very low opacity.
 *   3. one hover/press gesture, expressed as a CSS transform on the motif so
 *      it costs nothing and honours `prefers-reduced-motion` via the
 *      `motion-reduce:` variant.
 */
import { memo } from 'react';

export type MotifKey =
  | 'dawn'
  | 'mushaf'
  | 'beads'
  | 'arch'
  | 'meter'
  | 'pulse'
  | 'orbit'
  | 'columns'
  | 'waveform'
  | 'glyph'
  | 'contour'
  | 'bubbles'
  | 'board'
  | 'ticker';

export interface TileIdentity {
  /** `H S% L%` triplet — consumed as `hsl(var(--tile) / a)`. */
  accent: string;
  motif: MotifKey;
}

/** One row per launcher app. Keys mirror `PORTAL_APPS[].key`. */
const IDENTITY: Record<string, TileIdentity> = {
  now: { accent: '32 58% 62%', motif: 'dawn' },
  quran: { accent: '158 34% 46%', motif: 'mushaf' },
  dhikr: { accent: '174 38% 44%', motif: 'beads' },
  sunnah: { accent: '42 52% 52%', motif: 'arch' },
  duas: { accent: '188 34% 46%', motif: 'beads' },
  occasions: { accent: '28 46% 54%', motif: 'arch' },
  wellness: { accent: '142 36% 44%', motif: 'pulse' },
  fitness: { accent: '120 34% 44%', motif: 'pulse' },
  journal: { accent: '10 34% 52%', motif: 'columns' },
  weather: { accent: '204 44% 54%', motif: 'dawn' },
  knowledge: { accent: '268 32% 58%', motif: 'orbit' },
  pkm: { accent: '252 32% 58%', motif: 'orbit' },
  reading: { accent: '210 28% 52%', motif: 'columns' },
  podcasts: { accent: '198 44% 50%', motif: 'waveform' },
  diwan: { accent: '348 38% 54%', motif: 'meter' },
  'de-learning': { accent: '18 52% 54%', motif: 'glyph' },
  atlas: { accent: '192 42% 48%', motif: 'contour' },
  chat: { accent: '232 36% 60%', motif: 'bubbles' },
  games: { accent: '300 28% 56%', motif: 'board' },
  crypto: { accent: '96 34% 46%', motif: 'ticker' },
};

const FALLBACK: TileIdentity = { accent: '32 58% 62%', motif: 'dawn' };

export function getTileIdentity(key: string): TileIdentity {
  return IDENTITY[key] ?? FALLBACK;
}

/* ── motifs ─────────────────────────────────────────────────────────────
   All of them draw with `currentColor` so the tile sets the colour once,
   and all of them animate with a single transform on group hover.        */

const SVG = 'absolute inset-0 h-full w-full';
const EASE = 'transition-transform duration-[700ms] ease-out motion-reduce:transition-none';

function Motif({ motif }: { motif: MotifKey }) {
  switch (motif) {
    case 'dawn':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} origin-bottom group-hover:scale-y-110`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <circle cx="100" cy="104" r="26" />
            <circle cx="100" cy="104" r="44" opacity="0.6" />
            <circle cx="100" cy="104" r="64" opacity="0.35" />
            <line x1="0" y1="104" x2="200" y2="104" />
          </g>
        </svg>
      );
    case 'mushaf':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} group-hover:translate-y-[-3px]`}
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          >
            {[24, 40, 56, 72, 88, 104].map((y) => (
              <line key={y} x1="18" y1={y} x2="182" y2={y} />
            ))}
            <rect x="10" y="12" width="180" height="104" opacity="0.7" />
          </g>
        </svg>
      );
    case 'beads':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:rotate-[6deg] origin-center`} fill="currentColor">
            {Array.from({ length: 11 }, (_, i) => (
              <circle key={i} cx={20 + i * 16} cy={60 + Math.sin(i / 1.6) * 22} r="4" />
            ))}
          </g>
        </svg>
      );
    case 'arch':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} origin-bottom group-hover:scale-105`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M60 120 V70 a40 40 0 0 1 80 0 V120" />
            <path d="M76 120 V72 a24 24 0 0 1 48 0 V120" opacity="0.6" />
          </g>
        </svg>
      );
    case 'meter':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:translate-x-2`} stroke="currentColor" strokeWidth="2" fill="none">
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M${16 + i * 38} 72 q9 -18 18 0`} />
            ))}
            <line x1="10" y1="88" x2="190" y2="88" strokeWidth="1" opacity="0.5" />
          </g>
        </svg>
      );
    case 'pulse':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <path
            className={`${EASE} group-hover:translate-x-3`}
            d="M0 70 H50 l10 -26 l12 52 l12 -40 l10 14 H200"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case 'orbit':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g
            className={`${EASE} origin-center group-hover:rotate-[14deg]`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <ellipse cx="100" cy="60" rx="80" ry="30" />
            <ellipse cx="100" cy="60" rx="52" ry="52" opacity="0.55" />
            <circle cx="100" cy="60" r="6" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case 'columns':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:translate-y-[-4px]`} fill="currentColor">
            {[0, 1, 2].map((c) =>
              [0, 1, 2, 3, 4, 5].map((r) => (
                <rect
                  key={`${c}-${r}`}
                  x={16 + c * 62}
                  y={22 + r * 15}
                  width={r === 5 ? 30 : 48}
                  height="4"
                  rx="2"
                />
              )),
            )}
          </g>
        </svg>
      );
    case 'waveform':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} origin-center group-hover:scale-y-125`} fill="currentColor">
            {Array.from({ length: 24 }, (_, i) => {
              const h = 12 + Math.abs(Math.sin(i / 1.7)) * 58;
              return <rect key={i} x={8 + i * 8} y={60 - h / 2} width="3" height={h} rx="1.5" />;
            })}
          </g>
        </svg>
      );
    case 'glyph':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:translate-x-[-6px]`} fill="currentColor">
            <text x="26" y="86" fontSize="64" fontFamily="serif">
              A
            </text>
            <text x="112" y="86" fontSize="64" fontFamily="serif" opacity="0.6">
              ب
            </text>
          </g>
        </svg>
      );
    case 'contour':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:translate-x-2`} fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M-10 96 q50 -26 100 -6 t110 -18" />
            <path d="M-10 74 q54 -28 104 -8 t106 -20" opacity="0.7" />
            <path d="M-10 52 q58 -30 108 -10 t102 -22" opacity="0.45" />
            <circle cx="126" cy="46" r="4" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case 'bubbles':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:translate-y-[-4px]`} fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="18" y="26" width="104" height="34" rx="17" />
            <rect x="72" y="70" width="110" height="34" rx="17" opacity="0.6" />
          </g>
        </svg>
      );
    case 'board':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} origin-center group-hover:rotate-[4deg]`} fill="currentColor">
            {Array.from({ length: 6 }, (_, r) =>
              Array.from({ length: 8 }, (_, c) =>
                (r + c) % 2 === 0 ? (
                  <rect key={`${r}-${c}`} x={20 + c * 20} y={r * 20} width="20" height="20" />
                ) : null,
              ),
            )}
          </g>
        </svg>
      );
    case 'ticker':
      return (
        <svg className={SVG} viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <g className={`${EASE} group-hover:translate-x-3`} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M0 94 l34 -22 l26 16 l30 -38 l34 22 l30 -34 l46 -12" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

/**
 * The tile's motif layer. Kept memoised: the drawing depends only on the
 * motif key, so hovering or reordering the grid never re-renders it.
 */
export const TileMotif = memo(function TileMotif({ motif }: { motif: MotifKey }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden text-[hsl(var(--tile))] opacity-[0.16] transition-opacity duration-normal group-hover:opacity-[0.26] dark:opacity-[0.2] dark:group-hover:opacity-[0.3]"
      aria-hidden
    >
      <Motif motif={motif} />
    </div>
  );
});
