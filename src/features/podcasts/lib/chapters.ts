/**
 * Podlove Simple Chapters.
 *
 * Chapters are the single biggest thing separating a "plays audio" podcast app
 * from a premium one: a 2-hour interview without them is an opaque block, and
 * with them it is a table of contents you can navigate. Most serious podcast
 * feeds already publish them inline via the Podlove Simple Chapters namespace:
 *
 *     <psc:chapters version="1.2">
 *       <psc:chapter start="00:00:00.000" title="مقدمة" />
 *       <psc:chapter start="00:04:12"     title="الضيف" href="https://…" />
 *     </psc:chapters>
 *
 * We parse that inline form only. The `podcast:chapters` tag from the Podcasting
 * 2.0 namespace points at a separate JSON document, which would mean a second
 * network request per episode through a CORS proxy — deliberately out of scope
 * rather than half-implemented.
 *
 * `start` is `[HH:]MM:SS[.mmm]` per the spec, but real feeds also emit bare
 * seconds and single-digit hours, so the parser accepts all of those and rejects
 * anything it cannot read rather than guessing.
 */

export interface Chapter {
  /** Offset from the start of the episode, in seconds. */
  start: number;
  title: string;
  /** Optional link the publisher attached to the chapter. */
  href?: string;
  /** Optional chapter artwork. */
  image?: string;
}

/**
 * Parse a Podlove `start` attribute into seconds.
 * Returns null when the value is not a time we recognise.
 */
export function parseChapterStart(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  // Bare seconds ("312" or "312.5").
  if (/^\d+(\.\d+)?$/.test(value)) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? seconds : null;
  }

  // [HH:]MM:SS[.mmm]
  const match = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) return null;

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  // Milliseconds are written as a fraction: ".5" is 500 ms, not 5 ms.
  const millis = match[4] ? Number(match[4].padEnd(3, '0')) : 0;

  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/** Extract chapters from an `<item>` element. Returns [] when there are none. */
export function parseChapters(item: Element): Chapter[] {
  // getElementsByTagName is namespace-naive in DOMParser's XML mode, so both the
  // prefixed and bare spellings have to be tried.
  const nodes = [
    ...Array.from(item.getElementsByTagName('psc:chapter')),
    ...Array.from(item.getElementsByTagName('chapter')),
  ];
  if (nodes.length === 0) return [];

  const chapters: Chapter[] = [];
  const seen = new Set<number>();

  for (const node of nodes) {
    const start = parseChapterStart(node.getAttribute('start') ?? '');
    if (start === null) continue;
    const title = (node.getAttribute('title') ?? '').trim();
    if (!title) continue;
    // A duplicated start offset (some feeds repeat the block in both spellings)
    // would render as two identical rows.
    const key = Math.round(start * 1000);
    if (seen.has(key)) continue;
    seen.add(key);

    const href = (node.getAttribute('href') ?? '').trim();
    const image = (node.getAttribute('image') ?? '').trim();
    chapters.push({
      start,
      title,
      ...(href ? { href } : {}),
      ...(image ? { image } : {}),
    });
  }

  return chapters.sort((a, b) => a.start - b.start);
}

/**
 * Index of the chapter containing `position` (seconds), or -1.
 *
 * Binary search: the player calls this on every timeupdate (4 Hz), and a linear
 * scan over a 90-chapter episode inside a React render is exactly the kind of
 * thing that shows up as jank on a low-end phone.
 */
export function chapterIndexAt(chapters: readonly Chapter[], position: number): number {
  if (chapters.length === 0 || position < chapters[0].start) return -1;
  let low = 0;
  let high = chapters.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (chapters[mid].start <= position) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/** End of a chapter: the next chapter's start, or the episode duration. */
export function chapterEnd(
  chapters: readonly Chapter[],
  index: number,
  durationSeconds: number,
): number {
  const next = chapters[index + 1];
  if (next) return next.start;
  return durationSeconds > 0 ? durationSeconds : chapters[index].start;
}

/** `H:MM:SS` / `M:SS` for a chapter offset. */
export function formatChapterTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}
