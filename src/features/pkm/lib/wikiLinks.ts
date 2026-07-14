/**
 * Wiki-link parsing utilities.
 *
 * Syntax: `[[Note Title]]` — the raw text between `[[` and `]]` is the
 * link target. Case-insensitive matching, whitespace-collapsed.
 */

const WIKI_RE = /\[\[([^\[\]\n]+)\]\]/g;

export function extractWikiLinks(md: string): string[] {
  if (!md) return [];
  const out = new Set<string>();
  for (const m of md.matchAll(WIKI_RE)) {
    const raw = m[1].trim();
    if (raw) out.add(raw);
  }
  return [...out];
}

export function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Given a note body and a list of {id, title} pairs, return the ids of
 * notes that this body links to. Unmatched link_texts are ignored here
 * (they still live in the note markdown so a future note can resolve).
 */
export function resolveLinks(
  md: string,
  notes: { id: string; title: string }[],
): { id: string; title: string }[] {
  const targets = extractWikiLinks(md);
  if (!targets.length) return [];
  const map = new Map<string, { id: string; title: string }>();
  for (const n of notes) map.set(normalizeTitle(n.title || ''), n);
  const out: { id: string; title: string }[] = [];
  const seen = new Set<string>();
  for (const t of targets) {
    const hit = map.get(normalizeTitle(t));
    if (hit && !seen.has(hit.id)) { seen.add(hit.id); out.push(hit); }
  }
  return out;
}

/** Find notes whose bodies link to the given target title. */
export function findBacklinks(
  targetTitle: string,
  notes: { id: string; title: string; contentMd: string }[],
): { id: string; title: string }[] {
  const key = normalizeTitle(targetTitle);
  if (!key) return [];
  return notes
    .filter((n) =>
      extractWikiLinks(n.contentMd)
        .some((l) => normalizeTitle(l) === key),
    )
    .map((n) => ({ id: n.id, title: n.title }));
}