import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * fetch-rss edge function — robust RSS/Atom fetcher with:
 *   - SSRF-safe URL filtering (private IPs, link-local, metadata)
 *   - Conditional GET via ETag / Last-Modified, persisted in rss_feed_meta
 *   - Multi-strategy article extraction (JSON-LD, OpenGraph, <article>,
 *     content-class heuristic, paragraph cluster fallback)
 *   - Concurrency-limited scraping with bounded retry on transient failure
 *   - Per-feed status reporting back to the caller AND to rss_feed_meta
 *   - Background-write best effort: requests parsed feed items immediately
 *     and finishes scraping/storing in the background up to a deadline.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USER_AGENT = "Mozilla/5.0 (compatible; SmartHubReader/1.1; +https://github.com/alhibi/unified-life-forge)";
const FETCH_TIMEOUT_MS = 15_000;
const SCRAPE_TIMEOUT_MS = 12_000;
const SCRAPE_CONCURRENCY = 2;
const BG_DEADLINE_MS = 25_000;
const MAX_FEEDS_PER_REQUEST = 8;
const FEED_FETCH_CONCURRENCY = 2;
const MAX_FULL_CONTENT_CHARS = 12_000;
const MAX_RESPONSE_BYTES = 1_500_000; // 1.5 MB per feed response
const MAX_ITEMS_HARD_CAP = 60;
const MAX_RETRIES = 1; // one retry on network/5xx

// ─── Auth ──────────────────────────────────────────────────────────────────
async function requireUser(
  req: Request,
): Promise<
  | { ok: true; userId: string }
  | { ok: true; serviceRole: true }
  | { ok: false; status: number; error: string }
> {
  const auth = req.headers.get("authorization") ||
    req.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = auth.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: "Empty bearer token" };

  // Allow internal callers (cron / fetch-rss-cron) that authenticate with
  // the service-role key. We compare against the env var to avoid trusting
  // a forged JWT whose `role` claim says "service_role".
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { ok: true, serviceRole: true };
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }
  return { ok: true, userId: data.user.id };
}

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

function isSafeUrl(input: string): boolean {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (PRIVATE_HOSTNAME_PATTERNS.some((re) => re.test(host))) return false;
  return true;
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface FeedItem {
  title: string;
  link: string;
  description: string;
  fullContent: string;
  pubDate: string;
  image: string | null;
  images: string[];
  author?: string;
  source: string;
}

interface FeedResult {
  url: string;
  status: "ok" | "not_modified" | "error";
  title: string;
  sourceName: string;
  items: FeedItem[];
  error?: string;
  httpStatus?: number;
  etag?: string | null;
  lastModified?: string | null;
}

interface FeedMeta {
  source_url: string;
  etag?: string | null;
  last_modified?: string | null;
}

// ─── XML / RSS parser ──────────────────────────────────────────────────────
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function cdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function getTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? cdata(m[1]) : "";
}

function getAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["']`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

/** Prefer Atom's alternate HTML link over its self/edit/enclosure links. */
function getAtomEntryLink(block: string): string {
  const tags = block.match(/<link\s[^>]*\/?\s*>/gi) || [];
  let fallback = "";
  for (const tag of tags) {
    const href = tag.match(/\shref=["']([^"']+)["']/i)?.[1] || "";
    if (!href) continue;
    const rel = (tag.match(/\srel=["']([^"']+)["']/i)?.[1] || "alternate").toLowerCase();
    const type = tag.match(/\stype=["']([^"']+)["']/i)?.[1] || "";
    if (rel === "alternate" && (!type || /html/i.test(type))) return href;
    if (!fallback && !["self", "edit", "enclosure"].includes(rel)) fallback = href;
  }
  return fallback;
}

function safeAbsoluteUrl(value: string, baseUrl: string): string {
  try {
    const resolved = new URL(value, baseUrl);
    return isSafeUrl(resolved.toString()) ? resolved.toString() : "";
  } catch {
    return "";
  }
}

/** Remove common tracking noise so the same article is not archived twice. */
function canonicalArticleUrl(value: string, baseUrl: string): string {
  const resolved = safeAbsoluteUrl(value, baseUrl);
  if (!resolved) return "";
  try {
    const url = new URL(resolved);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^utm_/i.test(key) || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return "";
  }
}

function extractInlineImages(html: string): string[] {
  const imgs: string[] = [];
  // Capture src, data-src, or first srcset entry
  const re = /<img[^>]*?(?:src|data-src|data-original)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (
      url.startsWith("http") &&
      !/pixel|1x1|tracking|spacer|blank\.gif/i.test(url) &&
      !imgs.includes(url)
    ) imgs.push(url);
  }
  // srcset: pick the first URL of each
  const srcsetRe = /<img[^>]*?srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (
      first &&
      first.startsWith("http") &&
      !imgs.includes(first)
    ) imgs.push(first);
  }
  return imgs;
}

function parseJsonFeed(text: string, maxItems: number, baseUrl: string): {
  title: string;
  items: FeedItem[];
} | null {
  try {
    const feed = JSON.parse(text) as {
      version?: unknown;
      title?: unknown;
      items?: unknown;
    };
    if (typeof feed.version !== "string" || !feed.version.startsWith("https://jsonfeed.org/version/")) {
      return null;
    }
    const items: FeedItem[] = [];
    for (const raw of Array.isArray(feed.items) ? feed.items : []) {
      if (!raw || typeof raw !== "object" || items.length >= maxItems) continue;
      const item = raw as Record<string, unknown>;
      const link = canonicalArticleUrl(
        typeof item.url === "string" ? item.url : typeof item.external_url === "string" ? item.external_url : "",
        baseUrl,
      );
      if (!link) continue;
      const content = typeof item.content_html === "string"
        ? item.content_html
        : typeof item.content_text === "string"
          ? `<p>${item.content_text}</p>`
          : typeof item.summary === "string"
            ? `<p>${item.summary}</p>`
            : "";
      const author = Array.isArray(item.authors) && item.authors[0] && typeof item.authors[0] === "object"
        ? (item.authors[0] as Record<string, unknown>).name
        : undefined;
      const image = typeof item.image === "string" ? safeAbsoluteUrl(item.image, baseUrl) : "";
      items.push({
        title: typeof item.title === "string" ? item.title : "",
        link,
        description: decodeEntities(stripTags(content)).slice(0, 600),
        fullContent: content,
        pubDate: typeof item.date_published === "string"
          ? item.date_published
          : typeof item.date_modified === "string" ? item.date_modified : "",
        image: image || null,
        images: image ? [image] : extractInlineImages(content),
        author: typeof author === "string" ? author : undefined,
        source: typeof feed.title === "string" ? feed.title : "Feed",
      });
    }
    return { title: typeof feed.title === "string" ? feed.title : "Feed", items };
  } catch {
    return null;
  }
}

function parseRSS(xml: string, maxItems: number, baseUrl: string): {
  title: string;
  items: FeedItem[];
} {
  const trimmed = xml.trim();
  if (trimmed.startsWith("{")) {
    const jsonFeed = parseJsonFeed(trimmed, maxItems, baseUrl);
    if (jsonFeed) return jsonFeed;
  }
  const isAtom = xml.includes("<feed") && !xml.includes("<rss");
  const items: FeedItem[] = [];

  let feedTitle = "Feed";
  if (isAtom) {
    feedTitle = decodeEntities(stripTags(getTag(xml.substring(0, 4000), "title"))) || "Feed";
  } else {
    const ch = xml.match(/<channel>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/);
    if (ch) feedTitle = decodeEntities(cdata(stripTags(ch[1])));
  }

  if (isAtom) {
    const entryRe = /<entry[\s\S]*?<\/entry>/g;
    let m;
    while ((m = entryRe.exec(xml)) !== null && items.length < maxItems) {
      const e = m[0];
      const title = decodeEntities(stripTags(getTag(e, "title")));
      const linkRaw = getAtomEntryLink(e);
      const link = canonicalArticleUrl(linkRaw, baseUrl);
      if (!link) continue;
      const content = getTag(e, "content") || getTag(e, "summary");
      const pubDate = getTag(e, "published") || getTag(e, "updated");
      const author = stripTags(getTag(e, "name"));
      const mediaImg = getAttr(e, "media:thumbnail", "url") ||
        getAttr(e, "media:content", "url");
      const contentImgs = extractInlineImages(content);
      const images = mediaImg
        ? [mediaImg, ...contentImgs.filter((i) => i !== mediaImg)]
        : contentImgs;

      items.push({
        title,
        link,
        description: decodeEntities(stripTags(content)).slice(0, 600),
        fullContent: content,
        pubDate,
        image: images[0] || null,
        images,
        author: author || undefined,
        source: feedTitle,
      });
    }
  } else {
    const itemRe = /<item[\s\S]*?<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < maxItems) {
      const it = m[0];
      const title = decodeEntities(stripTags(getTag(it, "title")));
      let link = cdata(getTag(it, "link"));
      if (!link) {
        const lm = it.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        if (lm) link = cdata(lm[1]).trim();
      }
      link = canonicalArticleUrl(link, baseUrl);
      if (!link) continue;
      const contentEncoded = getTag(it, "content:encoded");
      const desc = getTag(it, "description");
      const fullContent = contentEncoded || desc;
      const description = decodeEntities(stripTags(fullContent)).slice(0, 600);
      const pubDate = getTag(it, "pubDate") || getTag(it, "dc:date");
      const author = stripTags(getTag(it, "dc:creator") || getTag(it, "author"));

      const images: string[] = [];
      const enclosure = getAttr(it, "enclosure", "url");
      if (
        enclosure &&
        (it.includes('type="image') ||
          /\.(jpg|jpeg|png|webp|gif|avif)/i.test(enclosure))
      ) images.push(enclosure);
      const mediaContent = getAttr(it, "media:content", "url");
      if (mediaContent && !images.includes(mediaContent)) {
        images.push(mediaContent);
      }
      const mediaThumb = getAttr(it, "media:thumbnail", "url");
      if (mediaThumb && !images.includes(mediaThumb)) images.push(mediaThumb);
      for (const img of extractInlineImages(fullContent)) {
        if (!images.includes(img)) images.push(img);
      }

      items.push({
        title,
        link,
        description,
        fullContent,
        pubDate,
        image: images[0] || null,
        images,
        author: author || undefined,
        source: feedTitle,
      });
    }
  }

  return { title: feedTitle, items };
}

// ─── Fetch with timeout + retry ────────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      // Retry on 5xx
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

// ─── Article extraction (multi-strategy) ───────────────────────────────────
function stripText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).trim();
}

function cleanArticleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(
      /<div[^>]*class="[^"]*(?:share|social|comment|related|sidebar|widget|ad-|advertisement|newsletter|subscribe|tag-bar|breadcrumb|nav)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      "",
    )
    .replace(/class="[^"]*"/gi, "")
    .replace(/style="[^"]*"/gi, "")
    .replace(/id="[^"]*"/gi, "")
    .replace(/data-[a-z-]+="[^"]*"/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContainer(html: string, startIdx: number): string | null {
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

/** Pull articleBody / image from JSON-LD if present (NewsArticle schema). */
function extractFromJsonLd(html: string): {
  body?: string;
  image?: string;
} | null {
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const raw = m[1].trim();
      const parsed = JSON.parse(raw);
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
          ? t.some((x) => /Article|NewsArticle|BlogPosting/i.test(x))
          : false;
        if (!isArticle) continue;
        const body = typeof c.articleBody === "string"
          ? c.articleBody
          : undefined;
        const image = typeof c.image === "string"
          ? c.image
          : Array.isArray(c.image)
          ? (typeof c.image[0] === "string" ? c.image[0] : c.image[0]?.url)
          : c.image?.url;
        if (body || image) return { body, image };
      }
    } catch {
      // bad JSON-LD block, try next
    }
  }
  return null;
}

/** OG / twitter:image */
function extractOgImage(html: string): string | null {
  const og = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  if (og?.[1]) return og[1];
  const tw = html.match(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  );
  return tw?.[1] || null;
}

async function scrapeArticle(url: string): Promise<{
  html: string;
  ogImage?: string;
} | null> {
  if (!isSafeUrl(url)) return null;
  try {
    const res = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "ar,en;q=0.7",
        },
        redirect: "follow",
      },
      SCRAPE_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    if (!isSafeUrl(res.url)) return null; // post-redirect safety
    const html = await res.text();

    const ogImage = extractOgImage(html) || undefined;

    // Strategy 1 — JSON-LD articleBody (most precise, used by major news sites).
    const ld = extractFromJsonLd(html);
    if (ld?.body && ld.body.length > 300) {
      return {
        html: `<p>${
          ld.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).join(
            "</p><p>",
          )
        }</p>`,
        ogImage: ld.image || ogImage,
      };
    }

    // Pre-clean noise.
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    // Strategy 2 — <article> or <main>
    for (const tag of ["article", "main"]) {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const m = clean.match(re);
      if (m && stripText(m[1]).length > 300) {
        return { html: cleanArticleHtml(m[1]), ogImage };
      }
    }

    // Strategy 3 — common content classes / itemprop articleBody
    const itemprop = clean.match(
      /<[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
    );
    if (itemprop && stripText(itemprop[1]).length > 300) {
      return { html: cleanArticleHtml(itemprop[1]), ogImage };
    }

    const contentClasses = [
      "entry-content",
      "article-body",
      "article-content",
      "post-content",
      "story-body",
      "news-content",
      "wysiwyg",
      "content-body",
      "single-content",
      "s-ct-inner",
      "rbct",
      "post__content",
      "rich-text",
      "story",
    ];
    for (const cls of contentClasses) {
      const idx = clean.indexOf(cls);
      if (idx !== -1) {
        const before = clean.lastIndexOf("<div", idx);
        if (before !== -1) {
          const content = extractContainer(clean, before);
          if (content && stripText(content).length > 300) {
            return { html: cleanArticleHtml(content), ogImage };
          }
        }
      }
    }

    // Strategy 4 — paragraph cluster (only if many decent paragraphs)
    const pRe = /<p[^>]*>[\s\S]*?<\/p>/gi;
    const ps: string[] = [];
    let pm;
    while ((pm = pRe.exec(clean)) !== null) {
      const text = stripText(pm[0]);
      if (text.length > 40) ps.push(pm[0]);
    }
    if (ps.length >= 4) {
      return { html: cleanArticleHtml(ps.join("\n")), ogImage };
    }

    return ogImage ? { html: "", ogImage } : null;
  } catch {
    return null;
  }
}

// ─── DB I/O ────────────────────────────────────────────────────────────────
function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function loadFeedMeta(
  sb: SupabaseClient,
  urls: string[],
): Promise<Map<string, FeedMeta>> {
  if (urls.length === 0) return new Map();
  const { data } = await sb
    .from("rss_feed_meta")
    .select("source_url, etag, last_modified")
    .in("source_url", urls);
  const map = new Map<string, FeedMeta>();
  (data || []).forEach((r: FeedMeta) => map.set(r.source_url, r));
  return map;
}

async function recordFeedMeta(
  sb: SupabaseClient,
  url: string,
  patch: {
    etag?: string | null;
    last_modified?: string | null;
    last_status?: number;
    last_error?: string | null;
    item_count_last?: number | null;
    increment_failures?: boolean;
    reset_failures?: boolean;
  },
): Promise<void> {
  // Use upsert with onConflict on PK.
  const row: Record<string, unknown> = {
    source_url: url,
    last_fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (patch.etag !== undefined) row.etag = patch.etag;
  if (patch.last_modified !== undefined) row.last_modified = patch.last_modified;
  if (patch.last_status !== undefined) row.last_status = patch.last_status;
  if (patch.last_error !== undefined) {
    row.last_error = patch.last_error
      ? patch.last_error.slice(0, 500)
      : null;
  }
  if (patch.item_count_last !== undefined) {
    row.item_count_last = patch.item_count_last;
  }

  if (patch.increment_failures || patch.reset_failures) {
    // Read-modify-write fallback (small table, low contention)
    const { data: existing } = await sb
      .from("rss_feed_meta")
      .select("consecutive_failures")
      .eq("source_url", url)
      .maybeSingle();
    const cur = (existing?.consecutive_failures as number | undefined) || 0;
    row.consecutive_failures = patch.reset_failures ? 0 : cur + 1;
  }

  await sb.from("rss_feed_meta").upsert(row, { onConflict: "source_url" });
}

async function storeArticles(
  sb: SupabaseClient,
  items: FeedItem[],
  sourceUrl: string,
  sourceName: string,
): Promise<void> {
  const links = items.map((i) => i.link).filter(Boolean);
  if (links.length === 0) return;
  const { data: existing } = await sb
    .from("rss_articles")
    .select("link, full_content")
    .in("link", links);
  const existingMap = new Map<string, number>();
  (existing || []).forEach((r: { link: string; full_content: string | null }) =>
    existingMap.set(r.link, (r.full_content || "").length)
  );

  const toUpsert: Record<string, unknown>[] = [];
  for (const item of items) {
    if (!item.link) continue;
    const existLen = existingMap.get(item.link);
    const newLen = (item.fullContent || "").length;
    if (existLen !== undefined && newLen <= existLen) continue;
    let parsedDate: string | null = null;
    if (item.pubDate) {
      try {
        parsedDate = new Date(item.pubDate).toISOString();
      } catch { /* skip */ }
    }
    toUpsert.push({
      title: item.title,
      link: item.link,
      description: item.description || "",
      full_content: item.fullContent || "",
      pub_date: parsedDate,
      image: item.image,
      images: item.images || [],
      source_name: sourceName,
      source_url: sourceUrl,
    });
  }
  for (let i = 0; i < toUpsert.length; i += 50) {
    const batch = toUpsert.slice(i, i + 50);
    const { error } = await sb.from("rss_articles").upsert(batch, {
      onConflict: "link",
    });
    if (error) console.error("rss_articles upsert error:", error.message);
  }
}

// ─── Concurrency-bounded scraper ───────────────────────────────────────────
async function scrapeMissingContent(items: FeedItem[]): Promise<void> {
  const targets = items.filter((it) =>
    it.link && stripText(it.fullContent || "").length < 300
  );
  if (targets.length === 0) return;

  let cursor = 0;
  const worker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= targets.length) return;
      const item = targets[idx];
      const scraped = await scrapeArticle(item.link);
      if (!scraped) continue;
      if (scraped.html && scraped.html.length > (item.fullContent?.length || 0)) {
        item.fullContent = scraped.html.length > MAX_FULL_CONTENT_CHARS
          ? scraped.html.slice(0, MAX_FULL_CONTENT_CHARS)
          : scraped.html;
        item.description = stripText(scraped.html).slice(0, 600);
        const newImgs = extractInlineImages(scraped.html);
        for (const ig of newImgs) {
          if (!item.images.includes(ig)) item.images.push(ig);
        }
      }
      if (scraped.ogImage && !item.image) item.image = scraped.ogImage;
      if (scraped.ogImage && !item.images.includes(scraped.ogImage)) {
        item.images.unshift(scraped.ogImage);
      }
    }
  };
  const workers = Array.from(
    { length: Math.min(SCRAPE_CONCURRENCY, targets.length) },
    () => worker(),
  );
  await Promise.all(workers);
}

// ─── Per-feed pipeline ─────────────────────────────────────────────────────
async function fetchSingleFeed(
  url: string,
  meta: FeedMeta | undefined,
  nameOverride: string | undefined,
  maxItems: number,
): Promise<FeedResult> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.5",
    "Accept-Language": "ar,en;q=0.7",
  };
  if (meta?.etag) headers["If-None-Match"] = meta.etag;
  if (meta?.last_modified) headers["If-Modified-Since"] = meta.last_modified;

  let res: Response;
  try {
    res = await fetchWithRetry(url, { headers, redirect: "follow" }, FETCH_TIMEOUT_MS);
  } catch (e: unknown) {
    return {
      url,
      status: "error",
      title: nameOverride || "",
      sourceName: nameOverride || url,
      items: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (!isSafeUrl(res.url)) {
    return {
      url,
      status: "error",
      title: nameOverride || "",
      sourceName: nameOverride || url,
      items: [],
      error: "Redirect landed on disallowed host",
      httpStatus: res.status,
    };
  }

  if (res.status === 304) {
    return {
      url,
      status: "not_modified",
      title: nameOverride || "",
      sourceName: nameOverride || url,
      items: [],
      httpStatus: 304,
    };
  }

  if (!res.ok) {
    return {
      url,
      status: "error",
      title: nameOverride || "",
      sourceName: nameOverride || url,
      items: [],
      error: `HTTP ${res.status}`,
      httpStatus: res.status,
    };
  }

  // Cap response size to avoid OOM on pathologically huge feeds.
  let text: string;
  try {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_RESPONSE_BYTES) {
      text = new TextDecoder().decode(buf.slice(0, MAX_RESPONSE_BYTES));
    } else {
      text = new TextDecoder().decode(buf);
    }
  } catch (e) {
    return {
      url,
      status: "error",
      title: nameOverride || "",
      sourceName: nameOverride || url,
      items: [],
      error: e instanceof Error ? e.message : String(e),
      httpStatus: res.status,
    };
  }
  const trimmedDocument = text.trim();
  const looksLikeXmlFeed = /<(?:[a-z]+:)?(?:rss|feed|rdf)\b/i.test(trimmedDocument);
  const looksLikeJsonFeed = /^\{/.test(trimmedDocument) && /"version"\s*:\s*"https:\/\/jsonfeed\.org\/version\//i.test(trimmedDocument);
  if (!looksLikeXmlFeed && !looksLikeJsonFeed) {
    return {
      url,
      status: "error",
      title: nameOverride || "",
      sourceName: nameOverride || url,
      items: [],
      error: "Response is not a recognised RSS, Atom, or JSON Feed document",
      httpStatus: res.status,
    };
  }
  const parsed = parseRSS(text, maxItems, res.url);
  // Free the raw feed buffer before we return.
  // eslint-disable-next-line no-useless-assignment -- intentional memory release
  text = "";
  const sourceName = nameOverride || parsed.title;
  parsed.items.forEach((it) => {
    it.source = sourceName;
    if (it.fullContent && it.fullContent.length > MAX_FULL_CONTENT_CHARS) {
      it.fullContent = it.fullContent.slice(0, MAX_FULL_CONTENT_CHARS);
    }
  });

  return {
    url,
    status: "ok",
    title: parsed.title,
    sourceName,
    items: parsed.items,
    httpStatus: res.status,
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // ── Structured request logging ──────────────────────────────────────────
  // Every log line carries the same request id so a failed invocation
  // (notably WORKER_RESOURCE_LIMIT, which kills the isolate without a
  // handler-level throw) can be traced end-to-end in the function logs.
  const requestId = req.headers.get("x-request-id") ||
    (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  const startedAt = Date.now();
  const heapMb = () => {
    try {
      const m = (Deno as unknown as { memoryUsage?: () => { heapUsed: number; rss: number } })
        .memoryUsage?.();
      return m ? { heapMb: Math.round(m.heapUsed / 1048576), rssMb: Math.round(m.rss / 1048576) } : {};
    } catch {
      return {};
    }
  };
  const log = (event: string, data: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({
      fn: "fetch-rss",
      requestId,
      event,
      ms: Date.now() - startedAt,
      ...heapMb(),
      ...data,
    }));
  };
  const logError = (event: string, reason: unknown, data: Record<string, unknown> = {}) => {
    console.error(JSON.stringify({
      fn: "fetch-rss",
      requestId,
      event,
      ms: Date.now() - startedAt,
      ...heapMb(),
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack?.split("\n").slice(0, 4).join(" | ") : undefined,
      ...data,
    }));
  };
  const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "x-request-id": requestId,
  };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }
  // Auth is optional: anonymous callers can fetch & parse public feeds,
  // but only authenticated users (or the service role) may persist rows
  // to rss_articles / rss_feed_meta. We downgrade `store` silently when
  // no valid bearer is presented.
  const auth = await requireUser(req);
  const authed = auth.ok;

  try {
    const body = await req.json();
    const {
      urls,
      limit,
      fetchFullContent,
      store,
      nameMap,
      raw,
    }: {
      urls?: unknown;
      limit?: number;
      fetchFullContent?: boolean;
      store?: boolean;
      nameMap?: Record<string, string>;
      raw?: boolean;
    } = body;
    const maxItems = Math.min(Math.max(1, Number(limit) || 30), MAX_ITEMS_HARD_CAP);

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      logError("bad_request", "No URLs provided");
      return new Response(JSON.stringify({ error: "No URLs provided" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    const safeUrls = (urls as unknown[])
      .filter((u): u is string => typeof u === "string")
      .filter(isSafeUrl)
      .slice(0, MAX_FEEDS_PER_REQUEST);
    if (safeUrls.length === 0) {
      logError("bad_request", "No valid http(s) URLs after SSRF filtering", {
        requestedUrls: (urls as unknown[]).length,
      });
      return new Response(
        JSON.stringify({
          error: "No valid http(s) URLs after SSRF filtering",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    log("request_start", {
      authed,
      feeds: safeUrls.length,
      droppedUrls: (urls as unknown[]).length - safeUrls.length,
      maxItems,
      fetchFullContent: Boolean(fetchFullContent),
      store: Boolean(store),
      raw: Boolean(raw),
    });

    // Secure raw XML proxying mode
    if (raw) {
      const url = safeUrls[0];
      const headers: Record<string, string> = {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.5",
        "Accept-Language": "ar,en;q=0.7",
      };
      try {
        const res = await fetchWithRetry(url, { headers, redirect: "follow" }, FETCH_TIMEOUT_MS);
        if (!res.ok) {
          logError("raw_http_error", `HTTP ${res.status}`, { url });
          return new Response(JSON.stringify({ error: `HTTP error ${res.status}` }), {
            status: res.status,
            headers: jsonHeaders,
          });
        }
        if (!isSafeUrl(res.url)) {
          logError("raw_unsafe_redirect", res.url, { url });
          return new Response(JSON.stringify({ error: "Redirect landed on disallowed host" }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        const text = await res.text();
        log("raw_ok", { url, bytes: text.length });
        return new Response(JSON.stringify({ xml: text }), {
          headers: jsonHeaders,
        });
      } catch (e: unknown) {
        logError("raw_failed", e, { url });
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
          status: 500,
          headers: jsonHeaders,
        });
      }
    }

    const sb = getServiceClient();

    // Pull cached ETag/Last-Modified for each feed (best-effort).
    let metaMap: Map<string, FeedMeta>;
    try {
      metaMap = await loadFeedMeta(sb, safeUrls);
    } catch {
      metaMap = new Map();
    }

    // Phase 1 — fetch & parse feeds with bounded concurrency to keep
    // peak memory low (each feed can hold up to a few MB of XML).
    const fetched: FeedResult[] = new Array(safeUrls.length);
    let feedCursor = 0;
    const feedWorker = async () => {
      while (true) {
        const i = feedCursor++;
        if (i >= safeUrls.length) return;
        const url = safeUrls[i];
        fetched[i] = await fetchSingleFeed(
          url,
          metaMap.get(url),
          nameMap?.[url],
          maxItems,
        );
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(FEED_FETCH_CONCURRENCY, safeUrls.length) },
        () => feedWorker(),
      ),
    );

    // Phase 2 — scrape full content (only when requested) + persist.
    // Anonymous callers cannot persist; we silently drop the write phase.
    if (store && authed) {
      const bg = (async () => {
        for (const fr of fetched) {
          if (fr.status !== "ok") {
            // Record failure / 304 metadata
            await recordFeedMeta(sb, fr.url, {
              last_status: fr.httpStatus,
              last_error: fr.status === "error" ? (fr.error || "error") : null,
              increment_failures: fr.status === "error",
              reset_failures: fr.status === "not_modified",
            }).catch(() => {});
            continue;
          }

          if (fetchFullContent) {
            await scrapeMissingContent(fr.items);
          }
          await storeArticles(sb, fr.items, fr.url, fr.sourceName);

          // Release the scraped bodies as soon as they are persisted — the
          // response payload never carries full HTML on the `store` path,
          // and keeping N feeds × M items of HTML alive is what pushes the
          // isolate past its memory ceiling (WORKER_RESOURCE_LIMIT).
          fr.items.forEach((it) => {
            it.fullContent = "";
          });

          // Persist new ETag/Last-Modified from response headers.
          await recordFeedMeta(sb, fr.url, {
            etag: fr.etag ?? null,
            last_modified: fr.lastModified ?? null,
            last_status: fr.httpStatus,
            last_error: null,
            item_count_last: fr.items.length,
            reset_failures: true,
          }).catch(() => {});
        }
      })();
      // Best-effort: respond after BG_DEADLINE_MS; the work continues but
      // the client doesn't wait beyond the cap.
      await Promise.race([
        bg,
        new Promise((r) => setTimeout(r, BG_DEADLINE_MS)),
      ]);
    }

    // Phase 3 — shape response
    const feeds = fetched
      .filter((f) => f.status === "ok")
      .map((f) => ({
        url: f.url,
        title: f.title,
        items: f.items,
        count: f.items.length,
      }));
    const statuses = fetched.map((f) => ({
      url: f.url,
      status: f.status,
      httpStatus: f.httpStatus,
      itemCount: f.items.length,
      error: f.error,
    }));

    for (const f of fetched) {
      if (f.status === "error") {
        logError("feed_failed", f.error || "unknown", {
          url: f.url,
          httpStatus: f.httpStatus,
        });
      }
    }
    log("request_done", {
      okFeeds: feeds.length,
      failedFeeds: fetched.length - feeds.length,
      items: feeds.reduce((n, f) => n + f.count, 0),
    });

    return new Response(
      JSON.stringify({
        requestId,
        feeds,
        statuses,
        errors: fetched
          .filter((f) => f.status === "error")
          .map((f) => `${f.url}: ${f.error || "unknown"}`),
      }),
      { headers: jsonHeaders },
    );
  } catch (e: unknown) {
    logError("handler_error", e);
    return new Response(
      JSON.stringify({ requestId, error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
});
