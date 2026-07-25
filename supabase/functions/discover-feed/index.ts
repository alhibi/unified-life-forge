import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  corsHeaders,
  decodeEntities,
  extractMeta,
  extractTitle,
  fetchWithRetry,
  isSafeUrl,
  jsonResponse,
  requireUser,
  stripText,
  USER_AGENT,
} from "../_shared/rss-utils.ts";

/**
 * discover-feed — given a website URL (e.g. "example.com" or
 * "https://example.com/"), find every RSS/Atom feed it advertises and
 * return a small preview (feed title, description, last 3 item titles)
 * for each so the user can pick before subscribing.
 *
 * Order of operations:
 *   1. Normalize the input (add https:// if missing).
 *   2. Fetch the HTML and look for <link rel="alternate" type=".../rss+xml">
 *      and ".../atom+xml" tags.
 *   3. If none found, probe a list of well-known feed paths
 *      (/feed, /rss, /atom.xml, …) in parallel.
 *   4. For every candidate, fetch it, sniff that it really is XML,
 *      parse the title + first 3 item titles, and return the lot.
 *
 * The function is read-only: nothing is written to the database.
 */

const FETCH_TIMEOUT_MS = 12_000;
const PARSE_TIMEOUT_MS = 8_000;

const COMMON_FEED_PATHS = [
  // No-slash forms
  "/feed",
  "/rss",
  "/feed.xml",
  "/rss.xml",
  "/atom.xml",
  "/index.xml",
  "/feed/atom",
  "/feed/rss",
  "/rss/feed",
  "/?feed=rss2",
  "/?format=rss",
  "/blog/feed",
  "/blog/rss",
  "/news/rss",
  "/news.xml",
  // Trailing-slash variants — some sites only respond on the slashed form
  "/feed/",
  "/rss/",
  "/blog/feed/",
];

function normalizeUrl(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  try {
    const u = new URL(raw);
    return u.toString();
  } catch {
    return null;
  }
}

function extractFeedLinks(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  // Some sites encode `&` as `&amp;` in their feed href attrs, so we
  // run every captured value through decodeEntities before resolving.
  const push = (raw: string) => {
    try {
      const abs = new URL(decodeEntities(raw), baseUrl).toString();
      if (!out.includes(abs)) out.push(abs);
    } catch { /* ignore malformed href */ }
  };
  // <link rel="alternate" type="application/rss+xml" href="...">
  const re =
    /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) push(m[1]);
  // The order of attrs varies; also try type-first, href-second.
  const re2 =
    /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(?:rss|atom)\+xml["']/gi;
  while ((m = re2.exec(html)) !== null) push(m[1]);
  return out;
}

async function probeFeed(
  url: string,
): Promise<
  | { url: string; ok: false }
  | {
    url: string;
    ok: true;
    title: string;
    description: string;
    itemCount: number;
    items: { title: string; pubDate: string | null; link: string | null }[];
    image?: string;
    favicon?: string;
    language?: string;
    /** Median seconds between publications, computed from up to 10
     *  most recent items. Null when we have fewer than 3 dated items. */
    medianGapSeconds: number | null;
    /** ISO timestamp of the most recent dated item. Lets the UI show
     *  "last updated 3 hours ago" without re-fetching. */
    lastPublishedAt: string | null;
  }
> {
  if (!isSafeUrl(url)) return { url, ok: false };
  try {
    const res = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept":
            "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.1",
        },
        redirect: "follow",
      },
      PARSE_TIMEOUT_MS,
      0,
    );
    if (!res.ok) return { url, ok: false };
    if (!isSafeUrl(res.url)) return { url, ok: false };
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    // Sniff: must look like XML (RSS/Atom) — quick checks before full parse
    const looksXml = /<\?xml/i.test(text.substring(0, 200)) ||
      /<rss[\s>]/i.test(text.substring(0, 500)) ||
      /<feed[\s>][^]*xmlns/i.test(text.substring(0, 1500));
    if (!looksXml && !/xml|rss|atom/i.test(ct)) return { url, ok: false };

    const isAtom = /<feed[\s>]/i.test(text.substring(0, 1000)) &&
      !/<rss[\s>]/i.test(text.substring(0, 1000));
    const titleMatch = text.match(
      /<channel>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i,
    ) || text.match(/<feed[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = text.match(
      /<channel>[\s\S]*?<description[^>]*>([\s\S]*?)<\/description>/i,
    ) || text.match(
      /<feed[\s\S]*?<subtitle[^>]*>([\s\S]*?)<\/subtitle>/i,
    );
    const imageMatch = text.match(
      /<channel>[\s\S]*?<image>[\s\S]*?<url>([\s\S]*?)<\/url>/i,
    );
    const langMatch = text.match(
      /<(?:channel>[\s\S]*?)?<language>([\s\S]*?)<\/language>/i,
    );
    const title = titleMatch
      ? decodeEntities(stripText(titleMatch[1]))
      : new URL(url).hostname;
    const description = descMatch
      ? decodeEntities(stripText(descMatch[1])).slice(0, 240)
      : "";
    const image = imageMatch ? stripText(imageMatch[1]) : undefined;
    const language = langMatch
      ? stripText(langMatch[1]).slice(0, 12) || undefined
      : undefined;

    // Walk the items collecting the first 5 titles+links (for the
    // preview list) and up to 10 timestamps (for the frequency
    // estimate). Either RSS <pubDate> / <dc:date> or Atom <published> /
    // <updated> is accepted.
    const items: { title: string; pubDate: string | null; link: string | null }[] = [];
    const dates: number[] = [];
    let count = 0;
    const blockRe = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi;
    let bm;
    while ((bm = blockRe.exec(text)) !== null) {
      count++;
      const block = bm[0];
      if (items.length < 5) {
        const tm = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const titleText = tm ? decodeEntities(stripText(tm[1])) : "";
        let link: string | null = null;
        if (isAtom) {
          const lm = block.match(
            /<link[^>]*\shref=["']([^"']+)["'][^>]*\/?>/i,
          );
          link = lm ? lm[1] : null;
        } else {
          const lm = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
          link = lm ? stripText(lm[1]) : null;
        }
        const dm = isAtom
          ? block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
            block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)
          : block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
            block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
        const pubDate = dm ? stripText(dm[1]) : null;
        items.push({ title: titleText, pubDate, link });
      }
      if (dates.length < 10) {
        const dm2 = isAtom
          ? block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
            block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)
          : block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
            block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
        if (dm2) {
          const t = Date.parse(stripText(dm2[1]));
          if (!Number.isNaN(t)) dates.push(t);
        }
      }
      if (count > 200) break;
    }
    if (count === 0) return { url, ok: false };

    // Compute median gap. Sort timestamps descending so gap[i] =
    // dates[i] - dates[i+1] is always positive.
    let medianGapSeconds: number | null = null;
    let lastPublishedAt: string | null = null;
    if (dates.length >= 3) {
      const sorted = [...dates].sort((a, b) => b - a);
      const gaps: number[] = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        const g = sorted[i] - sorted[i + 1];
        if (g > 0) gaps.push(g);
      }
      if (gaps.length > 0) {
        gaps.sort((a, b) => a - b);
        const mid = Math.floor(gaps.length / 2);
        const median = gaps.length % 2 === 0
          ? (gaps[mid - 1] + gaps[mid]) / 2
          : gaps[mid];
        medianGapSeconds = Math.max(1, Math.round(median / 1000));
      }
      lastPublishedAt = new Date(sorted[0]).toISOString();
    } else if (dates.length === 1) {
      lastPublishedAt = new Date(dates[0]).toISOString();
    }

    // Favicon: derive from the feed URL's origin. We pick the simple
    // "origin/favicon.ico" path because the alternative — fetching
    // the homepage and parsing <link rel=icon> — adds 1 round-trip
    // per candidate and the fallback URL works for ~95 % of sites.
    let favicon: string | undefined;
    try {
      favicon = new URL("/favicon.ico", url).toString();
    } catch { /* malformed url */ }

    return {
      url,
      ok: true,
      title,
      description,
      itemCount: count,
      items,
      image,
      favicon,
      language,
      medianGapSeconds,
      lastPublishedAt,
    };
  } catch {
    return { url, ok: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (typeof body.url !== "string") {
    return jsonResponse({ error: "Missing 'url' string" }, 400);
  }
  const normalized = normalizeUrl(body.url);
  if (!normalized || !isSafeUrl(normalized)) {
    return jsonResponse({ error: "URL is not allowed" }, 400);
  }

  // First, see if the input itself is already a feed.
  const direct = await probeFeed(normalized);
  if (direct.ok) {
    return jsonResponse({
      candidates: [direct],
      strategy: "direct",
    });
  }

  // Otherwise, fetch the HTML and try to discover feeds from it.
  let html = "";
  let pageTitle = "";
  let pageDescription = "";
  let pageImage = "";
  try {
    const res = await fetchWithRetry(
      normalized,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "ar,en;q=0.7",
        },
        redirect: "follow",
      },
      FETCH_TIMEOUT_MS,
      0,
    );
    if (!res.ok) {
      return jsonResponse(
        { error: `Site returned HTTP ${res.status}`, candidates: [] },
        200,
      );
    }
    if (!isSafeUrl(res.url)) {
      return jsonResponse(
        { error: "Redirect landed on disallowed host", candidates: [] },
        200,
      );
    }
    html = await res.text();
    pageTitle = extractTitle(html) || new URL(res.url).hostname;
    pageDescription = extractMeta(html, "og:description") ||
      extractMeta(html, "description") || "";
    pageImage = extractMeta(html, "og:image") || "";
  } catch (e) {
    return jsonResponse(
      {
        error: e instanceof Error ? e.message : "Failed to fetch site",
        candidates: [],
      },
      200,
    );
  }

  const declaredFeeds = extractFeedLinks(html, normalized);
  const probedPaths = COMMON_FEED_PATHS.map((p) => {
    try {
      return new URL(p, normalized).toString();
    } catch {
      return null;
    }
  }).filter((u): u is string => !!u && !declaredFeeds.includes(u));

  // Run declared first (highest signal), then probes. Both in parallel
  // but limited to keep latency bounded — enough headroom for the 18
  // probe paths plus a couple of declared feeds to all run together.
  const candidatesToCheck = [...declaredFeeds, ...probedPaths].slice(0, 22);
  const results = await Promise.all(candidatesToCheck.map(probeFeed));
  const ok = results.filter((r) => r.ok);

  return jsonResponse({
    site: {
      url: normalized,
      title: pageTitle,
      description: pageDescription,
      image: pageImage || undefined,
    },
    candidates: ok,
    strategy: declaredFeeds.length > 0 ? "declared" : "probed",
    probed: candidatesToCheck.length,
  });
});
