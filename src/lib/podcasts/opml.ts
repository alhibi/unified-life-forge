// OPML 2.0 import / export for podcast subscriptions.
//
// OPML is the de-facto interchange format for "list of podcasts" —
// every major podcast app (Apple Podcasts, Pocket Casts, Overcast,
// AntennaPod, gPodder) supports it as both source and sink. Keeping
// this lightweight implementation here means a brand-new SmartHub
// user can carry their existing subscriptions over in seconds, and
// existing users can take their library with them if they ever leave.
//
// We only model the slice of OPML 2.0 that podcatchers actually use:
// `<outline type="rss" xmlUrl="..." text="..." title="..." />` rows.
// Folders / nesting / categories are flattened on import — if a user
// had podcasts grouped into folders in their previous app, they'll
// arrive here as a flat list (subscriptions don't have categories in
// our store anyway).

import type { SubscribedPodcast } from './store';

/* -------------------------------------------------------------------------- */
/*  Export                                                                    */
/* -------------------------------------------------------------------------- */

/** Escape characters that would break out of an XML attribute value. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build an OPML 2.0 document string from the user's subscription list.
 * The output is ready to write to disk (no trailing whitespace surprises)
 * and validates against most podcatcher importers.
 */
export function buildOpml(subs: SubscribedPodcast[]): string {
  const generatedAt = new Date().toUTCString();
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>SmartHub Podcast Subscriptions</title>',
    `    <dateCreated>${generatedAt}</dateCreated>`,
    '  </head>',
    '  <body>',
  ];
  for (const s of subs) {
    // OPML's `text` attribute is required and is what most importers
    // display; `title` is technically optional but Apple Podcasts
    // expects it. We set both to the podcast title.
    const text = xmlEscape(s.title || s.author || s.origin);
    const author = xmlEscape(s.author || '');
    const xmlUrl = xmlEscape(s.origin);
    const htmlUrl = xmlEscape(s.link || '');
    lines.push(
      `    <outline type="rss" text="${text}" title="${text}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" author="${author}" />`,
    );
  }
  lines.push('  </body>', '</opml>', '');
  return lines.join('\n');
}

/** Trigger a browser download of the user's subscriptions as OPML. */
export function downloadOpml(subs: SubscribedPodcast[]) {
  const opml = buildOpml(subs);
  const blob = new Blob([opml], { type: 'text/x-opml; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // ISO date + safe characters only, so the file lands in Downloads
  // with a stable, sortable name regardless of platform.
  a.download = `smarthub-podcasts-${new Date().toISOString().slice(0, 10)}.opml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer the revoke until after the click handler completes — some
  // browsers race the URL release against the navigation otherwise.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* -------------------------------------------------------------------------- */
/*  Import                                                                    */
/* -------------------------------------------------------------------------- */

/** Subset of OPML data we pull out of an `<outline>` row. */
export interface OpmlEntry {
  feedUrl: string;
  title: string;
  author: string;
  htmlUrl: string;
}

/**
 * Parse an OPML document string and return the `rss` outlines as a flat
 * list. Tolerant of:
 *   • mixed `type` casing (`RSS`, `Rss`)
 *   • outlines without an explicit type (Pocket Casts emits these)
 *   • nested `<outline>` folders (Overcast groups by category)
 *   • CDATA-wrapped attributes
 * Returns an empty array for empty / invalid input rather than throwing,
 * because the import UI surfaces a generic "no feeds found" error.
 */
export function parseOpml(xml: string): OpmlEntry[] {
  if (!xml.trim()) return [];
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return [];
  }
  if (doc.getElementsByTagName('parsererror').length > 0) return [];

  const out: OpmlEntry[] = [];
  // OPML spec doesn't put `<outline>` only inside `<body>`, so we walk
  // every `<outline>` in the document and pick the ones that look
  // feed-shaped. Cheaper and more robust than recursing.
  const all = Array.from(doc.getElementsByTagName('outline'));
  const seen = new Set<string>();
  for (const el of all) {
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    const xmlUrl = (el.getAttribute('xmlUrl') ?? '').trim();
    // We accept any outline that has an `xmlUrl`, regardless of the
    // declared `type` — some exporters omit the attribute entirely.
    if (!xmlUrl) continue;
    if (type && type !== 'rss' && type !== 'atom') continue;
    if (seen.has(xmlUrl)) continue;
    seen.add(xmlUrl);

    out.push({
      feedUrl: xmlUrl,
      title: (el.getAttribute('text') ?? el.getAttribute('title') ?? '').trim(),
      author: (el.getAttribute('author') ?? '').trim(),
      htmlUrl: (el.getAttribute('htmlUrl') ?? '').trim(),
    });
  }
  return out;
}
