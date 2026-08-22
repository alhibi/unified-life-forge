import { afterEach, describe, expect, it } from 'vitest';

import { extractPhoto, readCachedPhoto, writeCachedPhoto } from '../placePhoto';

const DAY = 24 * 60 * 60_000;

describe('extractPhoto', () => {
  const goodPayload = {
    query: {
      pages: {
        '12345': {
          imageinfo: [
            {
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/x/y.jpg',
              extmetadata: {
                Artist: { value: '<span>Jane Photographer</span>' },
                LicenseShortName: { value: 'CC BY-SA 4.0' },
              },
            },
          ],
        },
      },
    },
  };

  it('extracts url + cleaned credit from a Commons response', () => {
    expect(extractPhoto(goodPayload)).toEqual({
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/x/y.jpg',
      credit: 'Jane Photographer · CC BY-SA 4.0',
    });
  });

  it('returns null for payloads without images', () => {
    expect(extractPhoto({ query: { pages: {} } })).toBeNull();
    expect(extractPhoto({})).toBeNull();
    expect(extractPhoto(null)).toBeNull();
    expect(extractPhoto('oops')).toBeNull();
  });

  it('rejects non-wikimedia urls (defence against API surprises)', () => {
    const evil = JSON.parse(JSON.stringify(goodPayload));
    evil.query.pages['12345'].imageinfo[0].thumburl = 'https://evil.example/x.jpg';
    expect(extractPhoto(evil)).toBeNull();
  });

  it('falls back to the full-res url when no thumb exists', () => {
    const noThumb = JSON.parse(JSON.stringify(goodPayload));
    delete noThumb.query.pages['12345'].imageinfo[0].thumburl;
    noThumb.query.pages['12345'].imageinfo[0].url = 'https://upload.wikimedia.org/wikipedia/commons/x/y.jpg';
    const got = extractPhoto(noThumb);
    expect(got?.url).toBe('https://upload.wikimedia.org/wikipedia/commons/x/y.jpg');
  });

  it('survives missing credit metadata', () => {
    const bare = JSON.parse(JSON.stringify(goodPayload));
    bare.query.pages['12345'].imageinfo[0].extmetadata = {};
    const got = extractPhoto(bare);
    expect(got?.credit).toBeNull();
  });
});

describe('photo cache', () => {
  afterEach(() => globalThis.localStorage?.clear());

  it('round-trips a hit and honours its longer TTL', () => {
    writeCachedPhoto('Brandenburg Gate', { url: 'https://x/w.jpg', credit: 'A' }, 1_000);
    expect(readCachedPhoto('brandenburg gate', 1_000 + 10 * DAY)).toEqual({ url: 'https://x/w.jpg', credit: 'A' });
  });

  it('expires positives after two weeks', () => {
    writeCachedPhoto('Berlin', { url: 'https://x/w.jpg', credit: null }, 1_000);
    expect(readCachedPhoto('Berlin', 1_000 + 15 * DAY)).toBeNull();
  });

  it('expires misses after three days so they get retried', () => {
    writeCachedPhoto('Obscure Place', { url: null, credit: null }, 1_000);
    expect(readCachedPhoto('Obscure Place', 1_000 + 2 * DAY)).toEqual({ url: null, credit: null });
    expect(readCachedPhoto('Obscure Place', 1_000 + 4 * DAY)).toBeNull();
  });

  it('unknown queries are cache misses, not errors', () => {
    expect(readCachedPhoto('never cached', 5_000)).toBeNull();
  });

  it('prunes expired entries when writing', () => {
    writeCachedPhoto('Old', { url: null, credit: null }, 1_000);
    writeCachedPhoto('New', { url: 'https://y.jpg', credit: null }, 1_000 + 40 * DAY);
    expect(readCachedPhoto('Old', 1_000 + 40 * DAY)).toBeNull();
    expect(readCachedPhoto('New', 1_000 + 40 * DAY)?.url).toBe('https://y.jpg');
  });
});
