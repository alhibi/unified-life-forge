import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/rss-utils.ts";

/**
 * fetch-rss-cron — invoked on a 30-minute schedule by pg_cron (see
 * 20260516221000_rss_cron.sql). Builds the canonical "all known
 * feeds" URL list from rss_feed_meta + rss_articles and forwards to
 * the existing fetch-rss function with store=true.
 *
 * No user context is needed: feeds are global, and ETag-aware fetches
 * make this a cheap operation when nothing has changed upstream.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  // Distinct source URLs: prefer rss_feed_meta (everything we've ever
  // touched), fall back to whatever we've stored articles for.
  const { data: metaRows } = await sb
    .from("rss_feed_meta")
    .select("source_url")
    .lt("consecutive_failures", 8);
  const { data: articleRows } = await sb
    .from("rss_articles")
    .select("source_url, source_name")
    .not("source_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  const urlSet = new Set<string>();
  const nameMap: Record<string, string> = {};
  (metaRows ?? []).forEach((r: { source_url: string }) => {
    if (r.source_url) urlSet.add(r.source_url);
  });
  (articleRows ?? []).forEach(
    (r: { source_url: string | null; source_name: string }) => {
      if (r.source_url) {
        urlSet.add(r.source_url);
        if (r.source_name) nameMap[r.source_url] = r.source_name;
      }
    },
  );

  const urls = Array.from(urlSet);
  if (urls.length === 0) {
    return jsonResponse({ refreshed: 0, message: "no feeds known yet" });
  }

  // Forward to fetch-rss with the service role token so we're allowed.
  const res = await fetch(`${supabaseUrl}/functions/v1/fetch-rss`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      urls,
      limit: 50,
      fetchFullContent: true,
      store: true,
      nameMap,
    }),
  });

  let payload: unknown = null;
  try { payload = await res.json(); } catch { /* tolerate non-JSON */ }

  return jsonResponse({
    refreshed: urls.length,
    httpStatus: res.status,
    upstream: payload,
  });
});
