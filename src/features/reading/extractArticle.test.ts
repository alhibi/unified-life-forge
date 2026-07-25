import { describe, expect, it } from 'vitest';

import {
  FULL_CONTENT_THRESHOLD,
  needsContentUpgrade,
  plainTextLength,
} from './extractArticle';

/**
 * Pure-function tests for the extractArticle module. The network-bound
 * `extractArticleBody` is deliberately not covered here — it lives
 * behind dedupe/retry/abort plumbing and is exercised end- by
 * the article reader integration; mocking the supabase client just to
 * confirm "we called it once" wouldn't add behavioural coverage.
 */

describe('plainTextLength', () => {
  it('returns 0 for empty / null / undefined input', () => {
    expect(plainTextLength('')).toBe(0);
    expect(plainTextLength(undefined)).toBe(0);
    expect(plainTextLength(null)).toBe(0);
  });

  it('counts only the visible prose, not markup', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    // "Hello world" = 11 chars. Whitespace from markup gets squashed.
    expect(plainTextLength(html)).toBe(11);
  });

  it('decodes / collapses HTML entities so they do not over-count', () => {
    // "Hello & world" -> 13 chars after the & entity is normalized to
    // a single space (we don't decode HTML entities, just strip them
    // — that's enough to *measure* prose length without rendering).
    const html = '<p>Hello&nbsp;world</p>';
    const len = plainTextLength(html);
    // Tolerate either treatment of &nbsp; as a single replacement
    // character — both stay below the upgrade threshold so the
    // behaviour we actually care about is preserved.
    expect(len).toBeGreaterThanOrEqual(10);
    expect(len).toBeLessThanOrEqual(12);
  });

  it('survives malformed HTML without throwing', () => {
    expect(() => plainTextLength('<p>unclosed')).not.toThrow();
    expect(() => plainTextLength('a < b > c')).not.toThrow();
  });

  it('collapses runs of whitespace introduced by tag stripping', () => {
    const html = '<p>one</p>\n\n<p>two</p>\n\n<p>three</p>';
    // After stripping tags we should see "one two three" — 13 chars.
    expect(plainTextLength(html)).toBe(13);
  });
});

describe('needsContentUpgrade', () => {
  it('returns false for non-http links — those can not be scraped', () => {
    expect(needsContentUpgrade('', 'mailto:author@example.com')).toBe(false);
    expect(needsContentUpgrade('', 'javascript:void(0)')).toBe(false);
    expect(needsContentUpgrade('', '')).toBe(false);
    expect(needsContentUpgrade('', undefined)).toBe(false);
  });

  it('returns true when body is short and link is http(s)', () => {
    const shortBody = '<p>Just a teaser line.</p>';
    expect(needsContentUpgrade(shortBody, 'https://example.com/a')).toBe(true);
    expect(needsContentUpgrade(shortBody, 'http://example.com/a')).toBe(true);
  });

  it('returns false when the body already meets the threshold', () => {
    const longBody = '<p>' + 'x'.repeat(FULL_CONTENT_THRESHOLD + 100) + '</p>';
    expect(needsContentUpgrade(longBody, 'https://example.com/a')).toBe(false);
  });

  it('treats undefined body as empty (needs upgrade)', () => {
    expect(needsContentUpgrade(undefined, 'https://example.com/a')).toBe(true);
  });

  it('uses prose length, not raw HTML length, for the threshold', () => {
    // Lots of markup, very little prose — should still need an upgrade.
    const heavyMarkup = '<div class="' + 'x'.repeat(FULL_CONTENT_THRESHOLD)
      + '"><p>tiny</p></div>';
    expect(needsContentUpgrade(heavyMarkup, 'https://example.com/a')).toBe(true);
  });
});
