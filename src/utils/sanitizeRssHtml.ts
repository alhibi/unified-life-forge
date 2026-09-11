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
const RSS_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote',
    'a', 'img', 'figure', 'figcaption',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title',
    'width', 'height',
    'target', 'rel', 'loading',
    'class',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'meta', 'link'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'srcset', 'srcdoc', 'formaction'],
  // Only allow http(s) and relative URLs. data: URLs are blocked outright
  // since a base64 SVG can still contain script in some browsers.
  ALLOWED_URI_REGEXP: /^(?:(?:https?:|mailto:|tel:)|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  USE_PROFILES: { html: true },
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
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    if (node.tagName === 'IMG' && !node.getAttribute('loading')) {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('referrerpolicy', 'no-referrer');
    }
  });
}

/**
 * Boilerplate blocks publishers inline inside the body itself: "read
 * also" rails, related-topic lists, share prompts. Feeds carry these in
 * their `content:encoded`, so removing them here keeps the reader on the
 * article text and its images only.
 */
const BOILERPLATE_TEXT =
  /^\s*(?:اقرأ\s*(?:أيضا|أيضاً|ايضا|المزيد)|إقرأ\s*(?:أيضا|أيضاً|المزيد)|شاهد\s*أيضا|موضوعات?\s*(?:ذات\s*صلة|متعلقة)|مواضيع\s*ذات\s*صلة|الأكثر\s*قراءة|شارك\s*(?:الخبر|المقال)|تابعنا|read\s*(?:more|also)|related(?:\s*(?:articles?|topics?|stories))?|share\s*this|advertisement|sponsored)\b/i;

/** Fraction of an element's text that sits inside links. */
function linkRatio(el: Element): number {
  const total = (el.textContent ?? '').trim().length;
  if (total === 0) return 1;
  let linked = 0;
  el.querySelectorAll('a').forEach((a) => {
    linked += (a.textContent ?? '').trim().length;
  });
  return linked / total;
}

/**
 * Prune in-body chrome from already-sanitized markup: link-only lists,
 * "read also" headings and the block that follows them, and empty shells.
 */
function pruneBoilerplate(html: string): string {
  if (typeof document === 'undefined') return html;
  const host = document.createElement('div');
  host.innerHTML = html;

  // Link rails masquerading as lists.
  host.querySelectorAll('ul, ol').forEach((list) => {
    if (linkRatio(list) > 0.6) list.remove();
  });

  // Boilerplate headings / paragraphs (and the sibling block they label).
  host.querySelectorAll('h1, h2, h3, h4, h5, h6, p, strong, span, div')
    .forEach((el) => {
      const text = (el.textContent ?? '').trim();
      if (!text || !BOILERPLATE_TEXT.test(text)) return;
      if (text.length > 120) return; // a real paragraph that merely starts so
      if (/^h[1-6]$/i.test(el.tagName)) {
        const next = el.nextElementSibling;
        if (next && linkRatio(next) > 0.5) next.remove();
      }
      el.remove();
    });

  // Link-only paragraphs left behind.
  host.querySelectorAll('p').forEach((p) => {
    const text = (p.textContent ?? '').trim();
    if (text.length === 0 && !p.querySelector('img')) p.remove();
    else if (text.length > 0 && text.length < 60 && linkRatio(p) > 0.7) p.remove();
  });

  // Headings that duplicate each other back-to-back.
  return host.innerHTML;
}

export function sanitizeRssHtml(html: string): string {
  if (!html) return '';
  ensureHook();
  const clean = DOMPurify.sanitize(html, RSS_SANITIZE_CONFIG) as unknown as string;

  // Custom cleanup for ads, layout empty tags and generic trackers
  const stripped = clean
    .replace(/class="[^"]*?(?:ad-|ads-|advertisement|tracker|banner)[^"]*?"/gi, '')
    .replace(/<p>\s*?(?:&nbsp;|\s)*?\s*?<\/p>/gi, '') // clean empty paragraphs
    .trim();

  return pruneBoilerplate(stripped).trim();
}

