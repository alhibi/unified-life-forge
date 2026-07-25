/**
 * Chapter parsing and lookup.
 *
 * The time format is where real feeds diverge from the Podlove spec, so most of
 * these cases come from shapes publishers actually emit.
 */
import { describe, expect, it } from 'vitest';

import {
  type Chapter,
  chapterEnd,
  chapterIndexAt,
  formatChapterTime,
  parseChapters,
  parseChapterStart,
} from './chapters';

function itemFromXml(inner: string): Element {
  const xml = `<?xml version="1.0"?><item xmlns:psc="http://podlove.org/simple-chapters">${inner}</item>`;
  return new DOMParser().parseFromString(xml, 'application/xml').documentElement;
}

describe('parseChapterStart', () => {
  it('reads the canonical HH:MM:SS.mmm form', () => {
    expect(parseChapterStart('00:00:00.000')).toBe(0);
    expect(parseChapterStart('00:04:12.500')).toBe(252.5);
    expect(parseChapterStart('01:30:05.250')).toBe(5405.25);
  });

  it('accepts the shapes real feeds emit', () => {
    expect(parseChapterStart('4:12')).toBe(252);
    expect(parseChapterStart('1:04:12')).toBe(3852);
    // A fraction, not milliseconds: ".5" is half a second.
    expect(parseChapterStart('00:00:01.5')).toBe(1.5);
    expect(parseChapterStart('312')).toBe(312);
    expect(parseChapterStart('312.5')).toBe(312.5);
    expect(parseChapterStart('  00:01:00  ')).toBe(60);
  });

  it('rejects what it cannot read instead of guessing', () => {
    expect(parseChapterStart('')).toBeNull();
    expect(parseChapterStart('abc')).toBeNull();
    expect(parseChapterStart('00:99:00')).toBeNull();
    expect(parseChapterStart('00:00:99')).toBeNull();
    expect(parseChapterStart('--:--:--')).toBeNull();
  });
});

describe('parseChapters', () => {
  it('returns [] for an item with no chapters', () => {
    expect(parseChapters(itemFromXml('<title>x</title>'))).toEqual([]);
  });

  it('parses, sorts and carries optional attributes', () => {
    const chapters = parseChapters(
      itemFromXml(`
        <psc:chapters version="1.2">
          <psc:chapter start="00:10:00" title="ثالثاً" />
          <psc:chapter start="00:00:00" title="مقدمة" />
          <psc:chapter start="00:04:12" title="الضيف" href="https://example.com" image="https://example.com/a.jpg" />
        </psc:chapters>`),
    );
    expect(chapters.map((c) => c.title)).toEqual(['مقدمة', 'الضيف', 'ثالثاً']);
    expect(chapters[1].start).toBe(252);
    expect(chapters[1].href).toBe('https://example.com');
    expect(chapters[1].image).toBe('https://example.com/a.jpg');
    expect(chapters[0].href).toBeUndefined();
  });

  it('drops entries without a usable start or title', () => {
    const chapters = parseChapters(
      itemFromXml(`
        <psc:chapters>
          <psc:chapter start="bogus" title="لا" />
          <psc:chapter start="00:01:00" title="" />
          <psc:chapter start="00:02:00" title="نعم" />
        </psc:chapters>`),
    );
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe('نعم');
  });

  it('de-duplicates a repeated offset', () => {
    const chapters = parseChapters(
      itemFromXml(`
        <psc:chapters>
          <psc:chapter start="00:05:00" title="أ" />
          <psc:chapter start="00:05:00" title="ب" />
        </psc:chapters>`),
    );
    expect(chapters).toHaveLength(1);
  });
});

describe('chapterIndexAt', () => {
  const chapters: Chapter[] = [
    { start: 0, title: 'a' },
    { start: 60, title: 'b' },
    { start: 120, title: 'c' },
  ];

  it('finds the containing chapter', () => {
    expect(chapterIndexAt(chapters, 0)).toBe(0);
    expect(chapterIndexAt(chapters, 59.9)).toBe(0);
    expect(chapterIndexAt(chapters, 60)).toBe(1);
    expect(chapterIndexAt(chapters, 5000)).toBe(2);
  });

  it('returns -1 before the first chapter and for an empty list', () => {
    expect(chapterIndexAt([{ start: 30, title: 'a' }], 10)).toBe(-1);
    expect(chapterIndexAt([], 10)).toBe(-1);
  });

  it('agrees with a linear scan across a large list', () => {
    const many: Chapter[] = Array.from({ length: 200 }, (_, i) => ({ start: i * 17, title: `c${i}` }));
    const linear = (position: number) => {
      let found = -1;
      many.forEach((c, i) => {
        if (c.start <= position) found = i;
      });
      return found;
    };
    for (const position of [0, 1, 16, 17, 500, 1699, 1700, 99999]) {
      expect(chapterIndexAt(many, position)).toBe(linear(position));
    }
  });
});

describe('chapterEnd', () => {
  const chapters: Chapter[] = [
    { start: 0, title: 'a' },
    { start: 60, title: 'b' },
  ];

  it('uses the next chapter start, then the duration', () => {
    expect(chapterEnd(chapters, 0, 300)).toBe(60);
    expect(chapterEnd(chapters, 1, 300)).toBe(300);
  });

  it('falls back to the chapter start when the duration is unknown', () => {
    expect(chapterEnd(chapters, 1, 0)).toBe(60);
  });
});

describe('formatChapterTime', () => {
  it('drops the hour component below one hour', () => {
    expect(formatChapterTime(0)).toBe('0:00');
    expect(formatChapterTime(75)).toBe('1:15');
    expect(formatChapterTime(3661)).toBe('1:01:01');
    expect(formatChapterTime(-5)).toBe('0:00');
  });
});
