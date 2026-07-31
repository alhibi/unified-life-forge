// Battle-tested HTML sanitization for RSS feed bodies before they are
// rendered through `dangerouslySetInnerHTML`. We previously relied on a
// hand-rolled regex stripper that could be bypassed by unquoted event
// handlers (`<img src=x onerror=alert(1)>`), SVG payloads, mismatched
// case, and the usual obfuscation tricks. DOMPurify resolves all of
// these because it walks a real DOM tree instead of pattern-matching
// source text.
import DOMPurify from 'dompurify';

// One configured profile shared across the app. Centralising it means a
// future tweak (allow `<aside>`, deny `<figure>`, etc.) is a single edit.
//
// NOTE ON `USE_PROFILES` — it used to be set here, and it silently disabled the
// two allowlists below. DOMPurify *replaces* `ALLOWED_TAGS` and `ALLOWED_ATTR`
// with the profile's own sets when `USE_PROFILES` is present rather than
// intersecting them, so the carefully written 25-tag / 13-attribute allowlist did
// nothing and the full HTML profile was in force. Demonstrated with dompurify
// 3.4.3: `<div style="position:fixed">` and `<table>` both survived a config whose
// allowlists named neither.
//
// The practical consequence was that `style` was allowed on every element, so a
// feed could ship `style="position:fixed;inset:0;z-index:99999"` and cover the
// whole viewport with its own content — and only the `FORBID_*` denylists were
// actually protecting anything, which is the weaker posture the header comment
// above says this module moved away from. It is removed; the allowlists are now
// the primary control and the denylists are defence in depth.
const RSS_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'span', 'div', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote',
    'a', 'img', 'figure', 'figcaption',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Common in article prose. Previously reachable only because USE_PROFILES was
    // quietly allowing the whole HTML profile; naming them keeps the rendering
    // identical now that the allowlist is real. `KEEP_CONTENT` means an omitted
    // tag loses its formatting but never its text.
    'sup', 'sub', 'small', 'mark', 'abbr', 'time', 'q', 'cite', 'del', 'ins',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title',
    'width', 'height',
    'target', 'rel', 'loading',
    // Set by the hook below. Without it here, a second sanitise pass strips the
    // attribute the first pass added, so the function was not idempotent.
    'referrerpolicy',
    'class',
    'datetime', 'cite',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'meta', 'link'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'srcset', 'srcdoc', 'formaction'],
  // http(s), mailto, tel and relative URLs only.
  //
  // This does NOT cover `data:` — DOMPurify exempts a fixed set of media tags
  // (img, audio, video, source, track) from `ALLOWED_URI_REGEXP` entirely, so a
  // `data:` image passes no matter what this pattern says. The header comment
  // claimed data URLs were "blocked outright"; they were not. The hook below
  // enforces it, because a config key cannot.
  ALLOWED_URI_REGEXP: /^(?:(?:https?:|mailto:|tel:)|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  KEEP_CONTENT: true,
};

// Force every outbound <a> to open in a new tab without leaking opener,
// and every image to lazy-load — both are RSS-reader hygiene rather than
// security but are best applied here so the consumer doesn't have to.
let hookInstalled = false;
function ensureHook(): void {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return;

    // `data:` bypasses ALLOWED_URI_REGEXP on DOMPurify's media tags, so it has to
    // be rejected here. Feeds address their media over http(s); a data URL in one
    // is an unvetted channel that also defeats the referrer policy below and shows
    // up in no CSP report.
    for (const attr of ['src', 'href'] as const) {
      const value = node.getAttribute(attr);
      if (value && /^\s*data:/i.test(value)) node.removeAttribute(attr);
    }

    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    if (node.tagName === 'IMG') {
      // Set unconditionally rather than only when `loading` is absent: gating both
      // attributes on one of them meant re-sanitising already-clean output dropped
      // `referrerpolicy` (stripped on the way in, not re-added on the way out), so
      // the second pass produced different HTML from the first.
      if (!node.getAttribute('loading')) node.setAttribute('loading', 'lazy');
      node.setAttribute('referrerpolicy', 'no-referrer');
    }
  });
}

export function sanitizeRssHtml(html: string): string {
  if (!html) return '';
  ensureHook();
  const clean = DOMPurify.sanitize(html, RSS_SANITIZE_CONFIG) as unknown as string;

  // Custom cleanup for ads, layout empty tags and generic trackers
  return clean
    .replace(/class="[^"]*?(?:ad-|ads-|advertisement|tracker|banner)[^"]*?"/gi, '')
    .replace(/<p>\s*?(?:&nbsp;|\s)*?\s*?<\/p>/gi, '') // clean empty paragraphs
    .trim();
}
