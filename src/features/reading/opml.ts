import type { FeedSource } from './types';

/**
 * OPML — the de-facto standard for portable feed lists. We support
 * importing from any RSS reader (Feedly, Inoreader, NetNewsWire, …)
 * and exporting our own feeds in the same shape.
 *
 * The XML is parsed via DOMParser (built into every browser) so we
 * don't need a third-party dependency. Errors during parse return an
 * empty list rather than throwing, so a corrupt file simply produces
 * "no feeds found" and the UI can prompt the user.
 */

const OPML_FEED_CATEGORIES: Record<string, string> = {
  // Common Feedly category labels → our category ids
  'news': 'news',
  'tech': 'tech',
  'technology': 'tech',
  'science': 'science',
  'islamic': 'islamic',
  'religion': 'islamic',
  'culture': 'culture',
  'sports': 'sports',
  'sport': 'sports',
};

function categorize(label: string | null | undefined): string {
  if (!label) return 'other';
  const norm = label.toLowerCase().trim();
  return OPML_FEED_CATEGORIES[norm] ?? 'other';
}

/**
 * Parse an OPML XML document into a list of FeedSource objects.
 * Walks every <outline> with an `xmlUrl` attribute, regardless of how
 * deeply nested it is, so both flat and category-grouped exports work.
 */
export function parseOpml(xml: string): FeedSource[] {
  if (!xml.trim()) return [];
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return [];
  }
  // DOMParser returns a <parsererror> doc on bad input.
  if (doc.querySelector('parsererror')) return [];

  const out: FeedSource[] = [];
  const seen = new Set<string>();

  const outlines = doc.querySelectorAll('outline[xmlUrl]');
  outlines.forEach((node) => {
    const url = (node.getAttribute('xmlUrl') || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    const name =
      node.getAttribute('title')?.trim() ||
      node.getAttribute('text')?.trim() ||
      (() => {
        try { return new URL(url).hostname; } catch { return url; }
      })();
    // Category = nearest ancestor outline's text (if any), else "other"
    let category = 'other';
    let parent = node.parentElement;
    while (parent && parent.tagName.toLowerCase() === 'outline') {
      if (!parent.getAttribute('xmlUrl')) {
        const label = parent.getAttribute('title') || parent.getAttribute('text');
        if (label) {
          category = categorize(label);
          break;
        }
      }
      parent = parent.parentElement;
    }
    out.push({ url, name, category, enabled: true });
  });

  return out;
}

/**
 * Build an OPML XML string from a list of FeedSource objects, grouped
 * by category (with a sensible default ordering). The output mirrors
 * what Feedly produces, so it round-trips through major readers.
 */
export function buildOpml(feeds: FeedSource[]): string {
  const byCat = new Map<string, FeedSource[]>();
  for (const f of feeds) {
    const cat = f.category || 'other';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(f);
  }

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const now = new Date().toUTCString();
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>SmartHub Reading subscriptions</title>',
    `    <dateCreated>${now}</dateCreated>`,
    '  </head>',
    '  <body>',
  ];
  for (const [cat, items] of byCat) {
    lines.push(`    <outline text="${escape(cat)}" title="${escape(cat)}">`);
    for (const f of items) {
      lines.push(
        `      <outline type="rss" text="${escape(f.name)}" title="${escape(f.name)}" xmlUrl="${escape(f.url)}"/>`,
      );
    }
    lines.push('    </outline>');
  }
  lines.push('  </body>', '</opml>');
  return lines.join('\n');
}

/**
 * Trigger a browser download of an OPML file containing the given
 * feeds. Filename includes today's date so multiple exports don't
 * overwrite each other in the user's downloads folder.
 */
export function downloadOpml(feeds: FeedSource[]): void {
  const xml = buildOpml(feeds);
  const today = new Date().toISOString().slice(0, 10);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smarthub-feeds-${today}.opml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
