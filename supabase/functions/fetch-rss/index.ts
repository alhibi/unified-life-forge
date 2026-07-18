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
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USER_AGENT = "Mozilla/5.0 (compatible; SmartHubReader/1.1; +https://github.com/alhibi/unified-life-forge)";
const FETCH_TIMEOUT_MS = 15_000;
const SCRAPE_TIMEOUT_MS = 12_000;
const SCRAPE_CONCURRENCY = 2;
const BG_DEADLINE_MS = 25_000;
const MAX_FEEDS_PER_REQUEST = 15;
const FEED_FETCH_CONCURRENCY = 4;
const MAX_FULL_CONTENT_CHARS = 20_000;
const MAX_RESPONSE_BYTES = 3_000_000; // 3 MB per feed response
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

function parseRSS(xml: string, maxItems: number): {
  title: string;
  items: FeedItem[];
} {
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
      const linkRaw = getAttr(e, "link", "href");
      const link = isSafeUrl(linkRaw) ? linkRaw : "";
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
      if (!isSafeUrl(link)) continue;
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
    let clean = html
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
        item.fullContent = scraped.html;
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

  const text = await res.text();
  const parsed = parseRSS(text, maxItems);
  const sourceName = nameOverride || parsed.title;
  parsed.items.forEach((it) => (it.source = sourceName));

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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    }: {
      urls?: unknown;
      limit?: number;
      fetchFullContent?: boolean;
      store?: boolean;
      nameMap?: Record<string, string>;
    } = body;
    const maxItems = Math.min(Math.max(1, Number(limit) || 50), 200);

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "No URLs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeUrls = (urls as unknown[])
      .filter((u): u is string => typeof u === "string")
      .filter(isSafeUrl)
      .slice(0, MAX_FEEDS_PER_REQUEST);
    if (safeUrls.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No valid http(s) URLs after SSRF filtering",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sb = getServiceClient();

    // Pull cached ETag/Last-Modified for each feed (best-effort).
    let metaMap: Map<string, FeedMeta>;
    try {
      metaMap = await loadFeedMeta(sb, safeUrls);
    } catch {
      metaMap = new Map();
    }

    // Phase 1 — fetch & parse all feeds in parallel
    const fetched = await Promise.all(
      safeUrls.map((url) =>
        fetchSingleFeed(
          url,
          metaMap.get(url),
          nameMap?.[url],
          maxItems,
        )
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

    return new Response(
      JSON.stringify({
        feeds,
        statuses,
        errors: fetched
          .filter((f) => f.status === "error")
          .map((f) => `${f.url}: ${f.error || "unknown"}`),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    console.error("Handler error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
