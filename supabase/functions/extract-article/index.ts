import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  corsHeaders,
  isSafeUrl,
  jsonResponse,
  optionalUser,
  scrapeArticle,
} from "../_shared/rss-utils.ts";

/**
 * extract-article — turns any web URL into a clean, readable article
 * payload (title, body HTML, hero image) using the same multi-strategy
 * scraper that fetch-rss uses for items missing full_content. Used by
 * the "Reader View" front-end that lets users paste a non-RSS link
 * (a tweet thread embed, a blog post, an essay) and read it inside the
 * app's reader UI.
 *
 * Read-only: never writes to the database.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  // Read-only scraper — anonymous callers are welcome. Historically this
  // gate fired for every signed-out browser because the bearer is the
  // project anon key, not a session JWT, so `auth.getUser(anonKey)`
  // always rejects with 401 and the UI surfaced a generic
  // "Edge Function returned a non-2xx status code".
  await optionalUser(req);

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return jsonResponse({ error: "Missing 'url' string" }, 400);

  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
  if (!isSafeUrl(normalized)) {
    return jsonResponse({ error: "URL is not allowed" }, 400);
  }

  const scraped = await scrapeArticle(normalized);
  if (scraped && scraped.html) {
    return jsonResponse({
      url: normalized,
      title: scraped.title,
      siteName: scraped.siteName,
      description: scraped.description,
      image: scraped.ogImage || null,
      html: scraped.html,
    });
  }

  // Fallback — many publishers either block datacenter user agents
  // (HTTP 403) or render the body client-side, so the regex strategies
  // above find nothing. A plain-text reader proxy handles both cases:
  // it returns the rendered prose, which we re-wrap as paragraphs.
  const proxied = await fetchReaderProxy(normalized);
  if (proxied && proxied.length > 200) {
    return jsonResponse({
      url: normalized,
      title: scraped?.title ?? "",
      siteName: scraped?.siteName,
      description: scraped?.description,
      image: scraped?.ogImage || null,
      html: paragraphsToHtml(proxied),
      partial: true,
    });
  }

  // Last resort — at least hand back the metadata we did read so the
  // reader shows a real card (title, image, summary) with a link out
  // instead of a hard failure screen.
  if (scraped && (scraped.description || scraped.ogImage || scraped.title)) {
    return jsonResponse({
      url: normalized,
      title: scraped.title,
      siteName: scraped.siteName,
      description: scraped.description,
      image: scraped.ogImage || null,
      html: scraped.description ? `<p>${escapeHtml(scraped.description)}</p>` : "",
      partial: true,
    });
  }

  // Nothing extractable at all. Still answer 200 with an empty payload so the
  // reader keeps whatever the feed gave it instead of surfacing a hard error
  // (a 422 here bubbled up to the UI as a blank screen).
  return jsonResponse({
    url: normalized,
    title: "",
    siteName: undefined,
    description: undefined,
    image: null,
    html: "",
    partial: true,
    extractable: false,
  });
});

/** Escape text destined for an HTML text node. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Turn plain text into simple, safe paragraph markup. */
function paragraphsToHtml(text: string): string {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40)
    .slice(0, 400);
  if (paras.length === 0) return "";
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

/**
 * Read the article through a public text-extraction proxy. Returns the
 * plain-text body, or null when the proxy is unavailable or slow — the
 * caller degrades to metadata-only rather than failing.
 */
async function fetchReaderProxy(url: string): Promise<string | null> {
  const target = `https://r.jina.ai/${url}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(target, {
      headers: { "Accept": "text/plain", "X-Return-Format": "text" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Hard cap the payload so one huge page cannot exhaust the worker.
    return text.slice(0, 200_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
