// Shared utilities for the reading edge functions. Kept dependency-free
// (no third-party imports) so each function bundles cleanly on Deno
// Edge runtime.

export const USER_AGENT =
  "Mozilla/5.0 (compatible; SmartHubReader/1.2; +https://github.com/alhibi/unified-life-forge)";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── SSRF guard ────────────────────────────────────────────────────────────
const PRIVATE_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127(?:\.\d+){3}$/,
  /^0\.0\.0\.0$/,
  /^10(?:\.\d+){3}$/,
  /^192\.168(?:\.\d+){2}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2}$/,
  /^169\.254(?:\.\d+){2}$/,
  /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])(?:\.\d+){2}$/,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /\.internal$/i,
  /\.local$/i,
  /\.localdomain$/i,
];

export function isSafeUrl(input: string): boolean {
  let u: URL;
  try { u = new URL(input); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (PRIVATE_HOSTNAME_PATTERNS.some((re) => re.test(host))) return false;
  return true;
}

// ─── Fetch with timeout + retry ────────────────────────────────────────────
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retries = 1,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 + 600 * attempt));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 + 600 * attempt));
      }
    }
  }
  throw lastErr ?? new Error("fetch failed");
}

// ─── HTML helpers ──────────────────────────────────────────────────────────
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, n) => String.fromCodePoint(parseInt(n, 16)),
    );
}

export function stripText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Class / id fragments that mark chrome rather than prose. Anything whose
 * class or id matches is dropped wholesale before scoring, so sidebars,
 * "most read" rails, share bars and newsletter prompts never leak into
 * the reader next to the real article.
 */
const NOISE_PATTERN =
  /(?:share|social|comment|related|read-?more|more-?news|most-?read|recommend|sidebar|side-?bar|widget|promo|banner|\bads?\b|ad-|-ad\b|advert|sponsor|newsletter|subscri|paywall|donate|follow|author-box|byline-box|tag-?(?:s|bar|list)|breadcrumb|\bnav\b|menu|pagination|footer|header|toolbar|meta-?bar|trending|popular|outbrain|taboola|disqus|cookie|consent|modal|popup|lightbox|gallery-?nav|caption-?credit|copyright|back-?to-?top|print|source-?link|topics)/i;

/** Block-level wrappers that are never article prose. */
const NOISE_TAGS = [
  "script", "style", "noscript", "iframe", "form", "button", "select",
  "textarea", "svg", "canvas", "video", "audio", "object", "embed",
  "nav", "aside", "footer", "header", "template", "dialog",
];

/** Tags we keep in the final body. Everything else is unwrapped. */
const KEEP_TAGS = new Set([
  "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
  "blockquote", "pre", "code", "ul", "ol", "li", "a", "img", "figure",
  "figcaption", "table", "thead", "tbody", "tr", "th", "td", "hr",
]);

/** Attributes worth preserving per tag — everything else is dropped. */
const KEEP_ATTRS: Record<string, string[]> = {
  a: ["href"],
  img: ["src", "alt"],
};

/** Remove chrome elements (by tag and by class/id) from a document. */
export function stripNoise(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of NOISE_TAGS) {
    out = out.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"),
      " ",
    );
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), " ");
  }
  // Drop containers whose class/id screams "not the article".
  for (const tag of ["div", "section", "ul", "ol", "figure", "span"]) {
    out = removeMatchingContainers(out, tag);
  }
  return out;
}

/**
 * Walk every `<tag ...>` occurrence and delete the whole subtree when its
 * class/id matches NOISE_PATTERN. Depth-aware so nested same-tag markup
 * doesn't cut the removal short.
 */
function removeMatchingContainers(html: string, tag: string): string {
  const open = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  let result = html;
  let guard = 0;
  while (guard++ < 400) {
    open.lastIndex = 0;
    let hit: RegExpExecArray | null = null;
    let m: RegExpExecArray | null;
    while ((m = open.exec(result)) !== null) {
      const attrs = m[1] || "";
      const cls = /(?:class|id)\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
      if (cls && NOISE_PATTERN.test(cls)) {
        hit = m;
        break;
      }
    }
    if (!hit) break;
    const end = findClosing(result, tag, hit.index);
    if (end === -1) {
      // Unbalanced markup — drop just the tag so we can't loop forever.
      result = result.slice(0, hit.index) + " " +
        result.slice(hit.index + hit[0].length);
      continue;
    }
    result = result.slice(0, hit.index) + " " + result.slice(end);
  }
  return result;
}

/** Index just past the matching closing tag, or -1 when unbalanced. */
function findClosing(html: string, tag: string, startIdx: number): number {
  const re = new RegExp(`<(\\/?)${tag}\\b[^>]*?(\\/?)>`, "gi");
  re.lastIndex = startIdx;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1] === "/") {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else if (m[2] !== "/") {
      depth++;
    }
  }
  return -1;
}

/** Ratio of characters sitting inside links — high means a link rail. */
function linkDensity(html: string): number {
  const total = stripText(html).length;
  if (total === 0) return 1;
  let linked = 0;
  const re = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) linked += stripText(m[1]).length;
  return linked / total;
}

/**
 * Reduce an extracted container to article prose only: whitelisted tags,
 * minimal attributes, no link rails, no empty shells.
 */
export function cleanArticleHtml(html: string, title = ""): string {
  let out = stripNoise(html);

  // Unwrap or drop every tag not on the whitelist.
  out = out.replace(/<(\/?)([a-z0-9]+)\b([^>]*)>/gi, (_all, slash, rawTag, attrs) => {
    const tag = String(rawTag).toLowerCase();
    if (!KEEP_TAGS.has(tag)) return " ";
    if (slash) return `</${tag}>`;
    const keep = KEEP_ATTRS[tag] ?? [];
    if (keep.length === 0) return `<${tag}>`;
    const kept: string[] = [];
    for (const name of keep) {
      const v = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i")
        .exec(String(attrs))?.[1];
      if (!v) continue;
      if (name === "href" && !/^https?:\/\//i.test(v)) continue;
      if (name === "src") {
        const src = v.startsWith("//") ? `https:${v}` : v;
        if (!/^https?:\/\//i.test(src)) return " ";
        if (/pixel|1x1|tracking|spacer|blank\.gif|\.svg($|\?)/i.test(src)) {
          return " ";
        }
        kept.push(`src="${src}"`);
        continue;
      }
      kept.push(`${name}="${v.replace(/"/g, "&quot;")}"`);
    }
    if (tag === "img" && kept.length === 0) return " ";
    return `<${tag}${kept.length ? " " + kept.join(" ") : ""}>`;
  });

  // Drop link-dense list blocks ("related stories" survivors).
  out = out.replace(/<(ul|ol)>[\s\S]*?<\/\1>/gi, (block) =>
    linkDensity(block) > 0.5 ? " " : block);

  // Drop paragraphs that are only a link or boilerplate one-liners.
  out = out.replace(/<p>([\s\S]*?)<\/p>/gi, (block, inner) => {
    const text = stripText(inner);
    if (text.length === 0) return "";
    if (text.length < 60 && linkDensity(inner) > 0.6) return "";
    return block;
  });

  // Remove a heading that merely repeats the article title.
  const normTitle = stripText(title).toLowerCase();
  if (normTitle.length > 8) {
    out = out.replace(/<(h2|h3|h4)>([\s\S]*?)<\/\1>/gi, (block, _t, inner) =>
      stripText(inner).toLowerCase() === normTitle ? "" : block);
  }

  out = out
    .replace(/<(p|li|h2|h3|h4|blockquote|figcaption|td|th|strong|b|em|i|a)>\s*<\/\1>/gi, "")
    .replace(/(?:<br>\s*){3,}/gi, "<br><br>")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();

  // Final gate — keep only top-level blocks. Everything loose at the root
  // (skip links, publish stamps, "most read" labels, stray anchors) is
  // page chrome that happened to live inside the article container.
  return keepTopLevelBlocks(out, title);
}

/** Block tags allowed to sit at the root of a cleaned article body. */
const ROOT_BLOCKS = new Set([
  "p", "h2", "h3", "h4", "ul", "ol", "blockquote", "pre", "figure",
  "table", "hr", "img",
]);

/** In-body labels that are chrome even when they arrive as prose. */
const CHROME_TEXT =
  /^(?:تخط[^\s]*\s|الأكثر\s*قراءة|أخبار\s*ذات\s*صلة|مواضيع\s*ذات\s*صلة|واصل\s*القراءة|شارك|تابعنا|اقرأ\s*أيض|شاهد\s*أيض|Published\b|Last\s*updated|Skip\b|Share\b|Read\s*more|Advertisement|Sponsored)/i;

/**
 * Rebuild the body from its root-level block elements only, dropping
 * chrome-labelled blocks. Loose text between blocks is discarded — it is
 * never article prose in practice, only bylines, timestamps and rails.
 */
function keepTopLevelBlocks(html: string, title: string): string {
  const open = /<([a-z0-9]+)\b[^>]*>/gi;
  const normTitle = stripText(title).toLowerCase();
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  let cursor = 0;
  while ((m = open.exec(html)) !== null) {
    if (m.index < cursor) continue;
    const tag = m[1].toLowerCase();
    if (!ROOT_BLOCKS.has(tag)) {
      cursor = m.index + m[0].length;
      open.lastIndex = cursor;
      continue;
    }
    let block: string;
    if (tag === "img" || tag === "hr") {
      block = m[0];
      cursor = m.index + m[0].length;
    } else {
      const end = findClosing(html, tag, m.index);
      if (end === -1) {
        cursor = m.index + m[0].length;
        open.lastIndex = cursor;
        continue;
      }
      block = html.slice(m.index, end);
      cursor = end;
    }
    open.lastIndex = cursor;
    const text = stripText(block);
    if (tag !== "img" && tag !== "figure" && tag !== "hr") {
      if (text.length === 0) continue;
      if (CHROME_TEXT.test(text) && text.length < 200) continue;
      if (normTitle.length > 8 && text.toLowerCase() === normTitle) continue;
    }
    parts.push(block);
  }
  const joined = parts.join("");
  // If the gate found nothing structured, keep the pre-gate markup so a
  // plain-text publisher body isn't wiped out entirely.
  return stripText(joined).length >= 200 ? joined : html;
}



export function extractContainer(
  html: string,
  startIdx: number,
): string | null {
  const tagEnd = html.indexOf(">", startIdx);
  if (tagEnd === -1) return null;
  let depth = 1;
  let i = tagEnd + 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return html.substring(tagEnd + 1, nextClose);
      i = nextClose + 6;
    }
  }
  return null;
}

export function extractFromJsonLd(html: string):
  | { body?: string; image?: string; title?: string; siteName?: string }
  | null
{
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
        ? parsed["@graph"]
        : [parsed];
      for (const c of candidates) {
        const t = c?.["@type"];
        const isArticle = typeof t === "string"
          ? /Article|NewsArticle|BlogPosting/i.test(t)
          : Array.isArray(t)
          ? t.some((x: string) => /Article|NewsArticle|BlogPosting/i.test(x))
          : false;
        if (!isArticle) continue;
        const body = typeof c.articleBody === "string"
          ? c.articleBody
          : undefined;
        const image = typeof c.image === "string"
          ? c.image
          : Array.isArray(c.image)
          ? typeof c.image[0] === "string" ? c.image[0] : c.image[0]?.url
          : c.image?.url;
        const title = typeof c.headline === "string" ? c.headline : undefined;
        const siteName = c.publisher?.name || undefined;
        if (body || image || title) return { body, image, title, siteName };
      }
    } catch { /* bad JSON-LD, try next */ }
  }
  return null;
}

export function extractOgImage(html: string): string | null {
  const og = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  if (og?.[1]) return og[1];
  const tw = html.match(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  );
  return tw?.[1] || null;
}

export function extractMeta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m?.[1] || null;
}

export function extractTitle(html: string): string | null {
  const og = extractMeta(html, "og:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(stripText(m[1])) : null;
}

export function extractInlineImages(html: string): string[] {
  const imgs: string[] = [];
  const re =
    /<img[^>]*?(?:src|data-src|data-original)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (
      url.startsWith("http") &&
      !/pixel|1x1|tracking|spacer|blank\.gif/i.test(url) &&
      !imgs.includes(url)
    ) imgs.push(url);
  }
  const srcsetRe = /<img[^>]*?srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (first && first.startsWith("http") && !imgs.includes(first)) {
      imgs.push(first);
    }
  }
  return imgs;
}

// ─── Multi-strategy article extraction ─────────────────────────────────────
export interface ScrapedArticle {
  title: string;
  html: string;
  ogImage?: string;
  siteName?: string;
  description?: string;
}

export async function scrapeArticle(
  url: string,
  timeoutMs = 12000,
): Promise<ScrapedArticle | null> {
  if (!isSafeUrl(url)) return null;
  let res: Response;
  try {
    res = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "ar,en;q=0.7",
        },
        redirect: "follow",
      },
      timeoutMs,
    );
  } catch { return null; }
  if (!res.ok) return null;
  if (!isSafeUrl(res.url)) return null;
  const html = await res.text();

  const ogImage = extractOgImage(html) || undefined;
  const ld = extractFromJsonLd(html);
  const title = ld?.title || extractTitle(html) || "";
  const siteName = ld?.siteName ||
    extractMeta(html, "og:site_name") ||
    new URL(url).hostname.replace(/^www\./, "");
  const description = extractMeta(html, "og:description") ||
    extractMeta(html, "description") || "";

  // Strategy 1 — JSON-LD articleBody
  if (ld?.body && ld.body.length > 300) {
    const paras = ld.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return {
      title,
      siteName,
      description,
      html: `<p>${paras.join("</p><p>")}</p>`,
      ogImage: ld.image || ogImage,
    };
  }

  // Chrome (nav/aside/footer/share rails/ad slots) is removed once, up
  // front, so every strategy below scores prose only.
  const clean = stripNoise(html);

  /** Collect candidate containers, then keep the highest-scoring body. */
  const candidates: string[] = [];

  for (const tag of ["article", "main"]) {
    const open = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    let m: RegExpExecArray | null;
    while ((m = open.exec(clean)) !== null) {
      const end = findClosing(clean, tag, m.index);
      if (end === -1) continue;
      candidates.push(clean.slice(m.index + m[0].length, end - tag.length - 3));
      if (candidates.length > 6) break;
    }
  }

  const itemprop = clean.match(
    /<([a-z]+)\b[^>]*itemprop=["']articleBody["'][^>]*>/i,
  );
  if (itemprop?.index !== undefined) {
    const tag = itemprop[1].toLowerCase();
    const end = findClosing(clean, tag, itemprop.index);
    if (end !== -1) {
      candidates.push(
        clean.slice(itemprop.index + itemprop[0].length, end - tag.length - 3),
      );
    }
  }

  const contentClasses = [
    "entry-content", "article-body", "article-content", "articleBody",
    "post-content", "story-body", "story-content", "news-content",
    "wysiwyg", "content-body", "single-content", "s-ct-inner", "rbct",
    "post__content", "rich-text", "text-content", "body-content",
  ];
  for (const cls of contentClasses) {
    const idx = clean.indexOf(cls);
    if (idx === -1) continue;
    const before = clean.lastIndexOf("<div", idx);
    if (before === -1) continue;
    const content = extractContainer(clean, before);
    if (content) candidates.push(content);
  }

  let best: { html: string; score: number } | null = null;
  for (const candidate of candidates) {
    const body = cleanArticleHtml(candidate, title);
    const text = stripText(body);
    if (text.length < 300) continue;
    const paragraphs = (body.match(/<p>/g) ?? []).length;
    // Prose length rewarded, link rails punished, real paragraphs bonus.
    const score = text.length * (1 - linkDensity(body)) + paragraphs * 60;
    if (!best || score > best.score) best = { html: body, score };
  }
  if (best) {
    return { title, siteName, description, html: best.html, ogImage };
  }

  // Fallback — paragraph cluster from the de-noised document.
  const pRe = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
  const ps: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = pRe.exec(clean)) !== null) {
    const text = stripText(pm[0]);
    if (text.length > 60 && linkDensity(pm[0]) < 0.4) ps.push(pm[0]);
  }
  if (ps.length >= 4) {
    const body = cleanArticleHtml(ps.join("\n"), title);
    if (stripText(body).length > 300) {
      return { title, siteName, description, html: body, ogImage };
    }
  }

  return ogImage
    ? { title, siteName, description, html: "", ogImage }
    : null;

}

// ─── Auth ──────────────────────────────────────────────────────────────────
export type AuthResult =
  | { ok: true; userId: string; token: string; serviceRole?: false }
  | { ok: true; serviceRole: true; token: string; userId?: undefined }
  | { ok: false; status: number; error: string };

/**
 * Public-friendly auth resolver used by edge functions whose underlying
 * resource is openly readable (e.g. `rss_articles` carries an
 * "Anyone can read articles" RLS policy and the `search_rss_articles`
 * RPC is `GRANT EXECUTE ... TO anon`).
 *
 * Unlike `requireUser`, this never rejects anonymous callers — it just
 * reports whether a real session JWT was presented and forwards
 * whatever bearer the platform passed through (anon key, session JWT,
 * or service-role key) so the downstream supabase-js client honors
 * the same RLS context as the caller.
 */
export type OptionalAuthResult = {
  ok: true;
  /** Original bearer (anon key, session JWT, or service role). May be
   *  null when the request arrived without an Authorization header at
   *  all (only possible when `verify_jwt = false` in config.toml). */
  token: string | null;
  /** Resolved auth.users id when a session JWT was presented. */
  userId?: string;
  /** True when the bearer matches `SUPABASE_SERVICE_ROLE_KEY`. */
  serviceRole: boolean;
  /** True when the caller is anonymous (no session, no service role). */
  anonymous: boolean;
};

export async function optionalUser(req: Request): Promise<OptionalAuthResult> {
  const authHeader = req.headers.get("authorization") ||
    req.headers.get("Authorization");

  // No bearer at all → still allow as anonymous. The platform is
  // expected to gate this with `verify_jwt = false` for genuinely
  // public functions; otherwise the platform would have already
  // returned 401 before we got here.
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: true, token: null, serviceRole: false, anonymous: true };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: true, token: null, serviceRole: false, anonymous: true };
  }

  // Internal callers (cron / fetch-rss-cron) authenticate with the
  // service-role key directly. Compare against the env var so a
  // forged JWT claim can't elevate.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { ok: true, token, serviceRole: true, anonymous: false };
  }

  // Try to resolve as a real user JWT. If `auth.getUser` rejects (the
  // bearer is the anon key, an expired session, or anything else
  // that doesn't represent a user), we treat the caller as anonymous
  // rather than failing the whole request — public archive reads do
  // not require an account.
  try {
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data, error } = await sb.auth.getUser(token);
    if (!error && data?.user) {
      return {
        ok: true,
        token,
        userId: data.user.id,
        serviceRole: false,
        anonymous: false,
      };
    }
  } catch { /* network / parse glitch — fall through to anonymous */ }

  return { ok: true, token, serviceRole: false, anonymous: true };
}

export async function requireUser(req: Request): Promise<AuthResult> {
  const auth = req.headers.get("authorization") ||
    req.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = auth.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: "Empty bearer token" };

  // Allow internal callers (cron / fetch-rss-cron) that authenticate with
  // the service-role key directly. We compare against the env var so a
  // forged JWT claim can't elevate.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { ok: true, serviceRole: true, token };
  }

  // Lazy import to avoid pulling supabase-js into functions that don't
  // need DB writes.
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2"
  );
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }
  return { ok: true, userId: data.user.id, token };
}

export function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
