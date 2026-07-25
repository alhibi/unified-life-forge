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
  if (!scraped) {
    return jsonResponse(
      { error: "Could not extract a readable article from that URL" },
      422,
    );
  }

  return jsonResponse({
    url: normalized,
    title: scraped.title,
    siteName: scraped.siteName,
    description: scraped.description,
    image: scraped.ogImage || null,
    html: scraped.html,
  });
});
