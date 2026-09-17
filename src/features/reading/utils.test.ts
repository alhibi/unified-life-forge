import { describe, expect, it } from 'vitest';

import { articleKey, mergeArticles } from './utils';

describe('article URL identity (R13)', () => {
  it('keeps functional reference and tracking-like parameters distinct', () => {
    for (const param of ['reference', 'referrerId', 'gclidMode', 'spmVersion']) {
      expect(articleKey(`https://example.org/story?${param}=one`)).not.toBe(articleKey(`https://example.org/story?${param}=two`));
    }
  });
  it('removes known tracking keys while preserving functional query values', () => {
    expect(articleKey('https://example.org/story?utm_source=rss&fbclid=123&reference=one')).toBe(articleKey('https://example.org/story?reference=one'));
  });
});

describe('article merge data safety (R12)', () => {
  it('preserves a full body when the next batch contains a teaser', () => {
    const original = { link: 'https://example.org/story', fullContent: 'Article text. '.repeat(300), description: 'Summary' };
    expect(mergeArticles([original], [{ ...original, fullContent: 'Short teaser' }])[0].fullContent).toBe(original.fullContent);
  });

  it('merges text and media independently instead of dropping fields from the losing record', () => {
    const body = '<p>Complete article. '.repeat(100) + '</p>';
    const old = { link: 'https://example.org/story', fullContent: body, description: 'Useful summary', image: null as string | null, images: [] as string[] };
    const fresh = { ...old, fullContent: '', description: '', image: 'https://example.org/cover.jpg', images: ['https://example.org/cover.jpg'] };
    const merged = mergeArticles([old], [fresh])[0];
    expect(merged.fullContent).toBe(body);
    expect(merged.description).toBe('Useful summary');
    expect(merged.image).toBe(fresh.image);
    expect(merged.images).toEqual(fresh.images);
  });

  it('does not count scripts, styles or invisible whitespace as article quality', () => {
    const full = '<p>A complete readable article with useful information.</p>';
    const inflated = `<style>${'x'.repeat(400)}</style><script>${'x'.repeat(400)}</script><p>${'&nbsp;'.repeat(100)}Teaser</p>`;
    const link = 'https://example.org/story';
    expect(mergeArticles([{ link, fullContent: full }], [{ link, fullContent: inflated }])[0].fullContent).toBe(full);
  });

  it('accepts an expanded body even when the older record has richer metadata', () => {
    const old = { link: 'https://example.org/story', fullContent: '<p>Teaser</p>', image: 'cover.jpg', description: 'Summary '.repeat(100) };
    const body = '<p>A more complete version. '.repeat(100) + '</p>';
    expect(mergeArticles([old], [{ ...old, image: '', description: '', fullContent: body }])[0].fullContent).toBe(body);
  });
});
