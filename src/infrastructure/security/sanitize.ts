/**
 * Defense-in-depth sanitization. `DOMPurify` alone is not enough; we also
 * (a) strip dangerous URL schemes that DOMPurify tolerates by default,
 * (b) hard-cap string length so an attacker cannot ship 100 MB of HTML,
 * (c) refuse any markup containing `<script>` / `<style>` even if the
 * configuration below gets widened by a future agent.
 */

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a', 'b', 'i', 'em', 'strong', 'u', 's', 'p', 'br', 'hr', 'blockquote', 'pre', 'code',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'img', 'figure',
  'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'small', 'sub', 'sup',
];

const ALLOWED_ATTR = [
  'href', 'title', 'alt', 'src', 'srcset', 'sizes', 'rel', 'target', 'lang', 'dir',
  'class', 'id', 'colspan', 'rowspan', 'aria-label', 'aria-describedby', 'role', 'tabindex',
  'data-block', 'data-lang',
];

const FORBIDDEN_SCHEMES = /^(?:javascript|data|vbscript|file|about|chrome|chrome-extension):/i;

const MAX_INPUT_BYTES = 256 * 1024;

export interface SanitizeOptions {
  maxLength?: number;
  allowImages?: boolean;
  allowLinks?: boolean;
  trustedHostnames?: readonly string[];
}

const DEFAULTS: Required<SanitizeOptions> = {
  maxLength: MAX_INPUT_BYTES,
  allowImages: true,
  allowLinks: true,
  trustedHostnames: [],
};

export function sanitizeHtml(input: string, options: SanitizeOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  if (input.length > opts.maxLength) {
    throw new Error(`Input exceeds ${opts.maxLength} byte cap`);
  }
  if (/<(?:script|style|iframe|object|embed|applet|form|meta|link|base)/i.test(input)) {
    return '';
  }
  const cfg: DOMPurify.Config = {
    ALLOWED_TAGS: opts.allowImages ? ALLOWED_TAGS : ALLOWED_TAGS.filter((t) => t !== 'img'),
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style'],
  };
  const cleaned = DOMPurify.sanitize(input, cfg);
  if (!opts.allowLinks) {
    return cleaned.replace(/<a [^>]*>([\s\S]*?)<\/a>/gi, '$1');
  }
  return cleaned.replace(/href\s*=\s*"([^"]+)"/gi, (match, url: string) => {
    if (FORBIDDEN_SCHEMES.test(url.trim())) return 'href="#"';
    if (opts.trustedHostnames.length > 0) {
      try {
        const parsed = new URL(url, 'https://smarthub.local');
        const host = parsed.hostname;
        if (!opts.trustedHostnames.some((h) => host === h || host.endsWith(`.${h}`))) {
          return 'href="#"';
        }
      } catch {
        return 'href="#"';
      }
    }
    return match;
  });
}

export function safeText(input: string, maxLength = 8_192): string {
  if (input.length > maxLength) input = input.slice(0, maxLength);
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}