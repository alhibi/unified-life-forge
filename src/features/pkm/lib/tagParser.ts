/**
 * Extract `#nested/tag` tokens from a markdown body.
 *
 * Rules:
 *  - a tag starts with `#` and must be preceded by start-of-string,
 *    whitespace, or `(` (so `##heading` and `color:#fff` do NOT match).
 *  - allowed chars: letters (incl. Arabic), digits, `_`, `-`, `/` for nesting.
 *  - trailing punctuation (`.`, `,`, `!`, `?`) is trimmed.
 */
const TAG_RE = /(?:^|[\s(])#([\p{L}\p{N}_/-]+)/gu;

export function extractTags(md: string): string[] {
  if (!md) return [];
  const out = new Set<string>();
  for (const m of md.matchAll(TAG_RE)) {
    const raw = m[1].replace(/[.,!?]+$/u, '');
    if (raw) out.add(raw.toLowerCase());
  }
  return [...out];
}

export interface TagNode {
  path: string;      // full nested path, e.g. "work/ideas"
  name: string;      // leaf label
  count: number;     // notes tagged here or below
  children: TagNode[];
}

/**
 * Build a nested tree of tags from a flat list of (path, noteId) pairs.
 * A note contributes +1 to every ancestor along its tag path.
 */
export function buildTagTree(pairs: { path: string; noteId: string }[]): TagNode[] {
  const roots: Record<string, TagNode> = {};
  // count DISTINCT notes per prefix
  const seen: Record<string, Set<string>> = {};
  const touch = (path: string, name: string): TagNode => {
    return (
      (roots[path] as TagNode | undefined) ??
      (roots[path] = { path, name, count: 0, children: [] })
    );
  };

  for (const { path, noteId } of pairs) {
    const parts = path.split('/').filter(Boolean);
    let acc = '';
    let parent: TagNode | null = null;
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      const node = touch(acc, part);
      if (!seen[acc]) seen[acc] = new Set();
      if (!seen[acc].has(noteId)) {
        seen[acc].add(noteId);
        node.count += 1;
      }
      if (parent && !parent.children.includes(node)) parent.children.push(node);
      parent = node;
    }
  }

  // top-level roots (paths without `/`)
  return Object.values(roots)
    .filter((n) => !n.path.includes('/'))
    .sort((a, b) => a.name.localeCompare(b.name));
}