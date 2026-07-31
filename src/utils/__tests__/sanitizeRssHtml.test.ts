/**
 * XSS tests for the app's only HTML sanitiser.
 *
 * WHY THIS FILE MATTERS
 *
 * `sanitizeRssHtml` is the single chokepoint in front of all five
 * `dangerouslySetInnerHTML` call sites:
 *
 *   features/podcasts/components/EpisodeListItem.tsx
 *   features/podcasts/components/PlayerSheet.tsx
 *   features/podcasts/pages/PodcastDetail.tsx
 *   features/reading/ArticleReader.tsx
 *   features/reading/ReaderView.tsx
 *
 * Every one of them renders HTML fetched from third-party RSS feeds and scraped
 * articles — i.e. attacker-controlled input from the app's point of view. It had
 * no test. A regression here is a stored-XSS in an app that holds journals,
 * private messages and a Supabase session token in localStorage, so a single
 * successful injection reads all of it.
 *
 * The cases below are the classes the file's own header says the previous
 * hand-rolled regex stripper failed at, plus the ones DOMPurify configuration
 * mistakes typically reopen.
 */

import { describe, expect, it } from 'vitest';

import { sanitizeRssHtml } from '../sanitizeRssHtml';

/** Lower-cased output, for substring assertions that should be case-blind. */
function clean(html: string): string {
  return sanitizeRssHtml(html).toLowerCase();
}

describe('sanitizeRssHtml — script execution', () => {
  it('removes a script element and its contents', () => {
    const out = clean('<p>before</p><script>alert(1)</script><p>after</p>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('is not fooled by mixed case', () => {
    const out = clean('<ScRiPt>alert(1)</ScRiPt>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('strips the unquoted event handler the old regex stripper missed', () => {
    // `<img src=x onerror=alert(1)>` is the exact bypass named in the module header.
    const out = clean('<img src=x onerror=alert(1)>');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert');
  });

  it('strips every inline event handler, not just the enumerated ones', () => {
    // FORBID_ATTR lists nine handlers by name. There are ~70 `on*` attributes, so
    // an allowlist on ALLOWED_ATTR — not the denylist — has to be what stops them.
    for (const attr of [
      'onerror',
      'onload',
      'onanimationstart',
      'onpointerover',
      'ontoggle',
      'oncopy',
      'onbeforeinput',
      'onwheel',
    ]) {
      const out = clean(`<p ${attr}="alert(1)">x</p>`);
      expect(out, attr).not.toContain(attr);
      expect(out, attr).not.toContain('alert');
    }
  });

  it('drops a javascript: URL on a link', () => {
    const out = clean('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('click');
  });

  it('drops a javascript: URL obfuscated with entities and whitespace', () => {
    for (const href of [
      'java\tscript:alert(1)',
      'java&#115;cript:alert(1)',
      ' javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      '&#106;avascript:alert(1)',
    ]) {
      const out = clean(`<a href="${href}">x</a>`);
      expect(out, href).not.toMatch(/javascript\s*:/);
    }
  });

  it('blocks data: URLs, which can carry script in an SVG', () => {
    const out = clean(
      '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
    );
    expect(out).not.toContain('data:');
  });
});

describe('sanitizeRssHtml — dangerous elements', () => {
  it('removes svg, which can host script and animated attribute payloads', () => {
    const out = clean('<svg><script>alert(1)</script></svg>');
    expect(out).not.toContain('<svg');
    expect(out).not.toContain('alert(1)');
  });

  it('removes an svg animate payload', () => {
    const out = clean(
      '<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>',
    );
    expect(out).not.toContain('<svg');
    expect(out).not.toContain('javascript:');
  });

  it('removes iframe, object and embed', () => {
    for (const tag of ['iframe', 'object', 'embed']) {
      const out = clean(`<${tag} src="https://evil.test"></${tag}>`);
      expect(out, tag).not.toContain(`<${tag}`);
      expect(out, tag).not.toContain('evil.test');
    }
  });

  it('removes form controls, so injected HTML cannot phish for credentials', () => {
    const out = clean(
      '<form action="https://evil.test"><input name="password"><button>Sign in</button></form>',
    );
    expect(out).not.toContain('<form');
    expect(out).not.toContain('<input');
    expect(out).not.toContain('evil.test');
  });

  it('removes style elements without leaking the CSS as visible text', () => {
    // KEEP_CONTENT is true, so a forbidden tag's children are normally kept. If
    // <style> is not also in DOMPurify's forbidden-contents set, the stylesheet
    // body reappears as text in the middle of the article.
    const out = clean('<style>body{display:none}</style><p>article</p>');
    expect(out).not.toContain('<style');
    expect(out).not.toContain('display:none');
    expect(out).toContain('article');
  });

  it('removes meta and link, which can redirect or preload', () => {
    const out = clean(
      '<meta http-equiv="refresh" content="0;url=https://evil.test"><link rel="stylesheet" href="https://evil.test/x.css">',
    );
    expect(out).not.toContain('<meta');
    expect(out).not.toContain('<link');
    expect(out).not.toContain('evil.test');
  });

  it('strips srcdoc and srcset', () => {
    const out = clean('<img srcset="x 1x" srcdoc="<script>alert(1)</script>">');
    expect(out).not.toContain('srcdoc');
    expect(out).not.toContain('srcset');
  });

  it('strips a form-hijacking formaction', () => {
    const out = clean('<button formaction="javascript:alert(1)">x</button>');
    expect(out).not.toContain('formaction');
    expect(out).not.toContain('javascript:');
  });

  it('strips style attributes, so injected content cannot overlay the UI', () => {
    // `style` is not in ALLOWED_ATTR. Without that, a feed could position an
    // element over the whole viewport and clickjack anything behind it.
    const out = clean(
      '<div style="position:fixed;inset:0;z-index:99999">overlay</div>',
    );
    expect(out).not.toContain('position:fixed');
    expect(out).not.toContain('style=');
  });

  it('drops data-* attributes', () => {
    const out = clean('<p data-tracker="1">x</p>');
    expect(out).not.toContain('data-tracker');
  });
});

describe('sanitizeRssHtml — legitimate content survives', () => {
  it('keeps the formatting tags a feed body actually uses', () => {
    const out = sanitizeRssHtml(
      '<h2>Title</h2><p><strong>bold</strong> and <em>italic</em></p>' +
        '<ul><li>one</li><li>two</li></ul><blockquote>quoted</blockquote>',
    );
    for (const fragment of ['<h2>', '<strong>', '<em>', '<ul>', '<li>', '<blockquote>']) {
      expect(out, fragment).toContain(fragment);
    }
    expect(out).toContain('Title');
    expect(out).toContain('quoted');
  });

  it('keeps http(s) links and images', () => {
    const out = sanitizeRssHtml(
      '<a href="https://example.test/a">link</a><img src="https://example.test/i.png" alt="pic">',
    );
    expect(out).toContain('https://example.test/a');
    expect(out).toContain('https://example.test/i.png');
    expect(out).toContain('alt="pic"');
  });

  it('keeps mailto and tel links', () => {
    expect(sanitizeRssHtml('<a href="mailto:a@b.test">mail</a>')).toContain('mailto:');
    expect(sanitizeRssHtml('<a href="tel:+123">call</a>')).toContain('tel:');
  });

  it('preserves Arabic text and direction markup unharmed', () => {
    const arabic = '<p>مرحبا بالعالم — نص عربي</p>';
    expect(sanitizeRssHtml(arabic)).toContain('مرحبا بالعالم');
  });

  it('keeps tables', () => {
    const out = sanitizeRssHtml('<table><tbody><tr><td>cell</td></tr></tbody></table>');
    expect(out).toContain('<table>');
    expect(out).toContain('cell');
  });
});

describe('sanitizeRssHtml — outbound link and image hygiene', () => {
  it('forces links to open in a new tab with no opener', () => {
    const out = sanitizeRssHtml('<a href="https://example.test">x</a>');
    expect(out).toContain('target="_blank"');
    // Without noopener the opened page can reach back through window.opener.
    expect(out).toContain('noopener');
    expect(out).toContain('noreferrer');
  });

  it('overrides a hostile target/rel supplied by the feed', () => {
    const out = sanitizeRssHtml('<a href="https://example.test" target="_self" rel="opener">x</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('noopener');
    expect(out).not.toMatch(/rel="opener"/);
  });

  it('lazy-loads images and withholds the referrer', () => {
    const out = sanitizeRssHtml('<img src="https://example.test/i.png">');
    expect(out).toContain('loading="lazy"');
    // A feed image URL is a tracking pixel as often as not.
    expect(out).toContain('referrerpolicy="no-referrer"');
  });

  it('respects an explicit loading attribute', () => {
    const out = sanitizeRssHtml('<img src="https://example.test/i.png" loading="eager">');
    expect(out).toContain('loading="eager"');
  });
});

describe('sanitizeRssHtml — edge cases', () => {
  it('returns an empty string for empty input', () => {
    expect(sanitizeRssHtml('')).toBe('');
    // The signature says `string`, but RSS parsers hand back null/undefined.
    expect(sanitizeRssHtml(null as unknown as string)).toBe('');
    expect(sanitizeRssHtml(undefined as unknown as string)).toBe('');
  });

  it('survives unbalanced and truncated markup', () => {
    expect(() => sanitizeRssHtml('<p><strong>unclosed')).not.toThrow();
    expect(() => sanitizeRssHtml('</p></div>')).not.toThrow();
    expect(() => sanitizeRssHtml('<p title="unterminated')).not.toThrow();
  });

  it('escapes rather than executes text that looks like markup', () => {
    const out = sanitizeRssHtml('<p>1 &lt; 2 &amp;&amp; 3 &gt; 2</p>');
    expect(out).toContain('&lt;');
    expect(out).toContain('&amp;');
  });

  it('drops empty paragraphs the ad-stripping pass targets', () => {
    const out = sanitizeRssHtml('<p>real</p><p>&nbsp;</p><p>  </p>');
    expect(out).toContain('real');
    expect(out.match(/<p>/g) ?? []).toHaveLength(1);
  });

  it('is idempotent — sanitising twice changes nothing', () => {
    // The consumers memoise, but a re-render or a cache round-trip can re-sanitise.
    // If a second pass altered the output, the hook-added attributes would compound.
    const input =
      '<p>text</p><a href="https://example.test">l</a><img src="https://example.test/i.png">';
    const once = sanitizeRssHtml(input);
    expect(sanitizeRssHtml(once)).toBe(once);
  });

  it('does not choke on a deeply nested document', () => {
    const deep = '<div>'.repeat(400) + 'x' + '</div>'.repeat(400);
    expect(() => sanitizeRssHtml(deep)).not.toThrow();
    expect(sanitizeRssHtml(deep)).toContain('x');
  });
});
