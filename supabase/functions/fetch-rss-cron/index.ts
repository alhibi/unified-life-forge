import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";

// In-memory throttle for user-triggered manual runs. Survives for the
// lifetime of the isolate; per-instance only, which is good enough as a
// belt-and-braces guard against double-clicks / accidental spam.
let lastUserTriggerAt = 0;
const USER_TRIGGER_COOLDOWN_MS = 60_000;

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

  // Two accepted callers:
  //   1. pg_cron (via invoke_edge_function) — bearer == service role key.
  //   2. Authenticated user hitting the "Run now" button in CronView.
  // requireUser() already handles both: it treats an exact service-role
  // token match as ok+serviceRole, and validates any other JWT via
  // supabase.auth.getUser().
  const auth = await requireUser(req);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error ?? "Unauthorized" }, auth.status ?? 401);
  }
  // Rate-limit only the manual/user-triggered path so a user can't spam
  // the cron. The internal service-role caller is unaffected.
  if (!auth.serviceRole) {
    const now = Date.now();
    const delta = now - lastUserTriggerAt;
    if (delta < USER_TRIGGER_COOLDOWN_MS) {
      return jsonResponse(
        {
          error: "Rate limited",
          retryAfterMs: USER_TRIGGER_COOLDOWN_MS - delta,
        },
        429,
      );
    }
    lastUserTriggerAt = now;
  }

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

  // Forward to fetch-rss in small sequential batches. Sending every known
  // feed in one call made the downstream isolate hold all parsed feeds plus
  // scraped article bodies in memory at once, which tripped
  // WORKER_RESOURCE_LIMIT (memory limit exceeded).
  const BATCH_SIZE = 6;
  const batchStatuses: { batch: number; httpStatus: number }[] = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNames: Record<string, string> = {};
    for (const u of batch) if (nameMap[u]) batchNames[u] = nameMap[u];

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/fetch-rss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          urls: batch,
          limit: 25,
          fetchFullContent: true,
          store: true,
          nameMap: batchNames,
        }),
      });
      // Drain and discard the body so the response buffer is freed instead
      // of accumulating across batches.
      await res.text().catch(() => "");
      batchStatuses.push({ batch: i / BATCH_SIZE, httpStatus: res.status });
    } catch (_e) {
      batchStatuses.push({ batch: i / BATCH_SIZE, httpStatus: 0 });
    }
  }

  return jsonResponse({
    refreshed: urls.length,
    batches: batchStatuses,
  });
});
