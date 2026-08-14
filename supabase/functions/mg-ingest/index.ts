import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";
import { fetchFeed, parseFeed } from "../_shared/marginalia.ts";
import { ingestUrl } from "../_shared/marginaliaPipeline.ts";

/**
 * mg-ingest — walks a user's active sources, pulls new feed items and runs
 * each through the ingestion pipeline. Callable by the user ("refresh now")
 * or internally by the daily cron with the service-role key + { userId }.
 *
 * Memory-bound on purpose: edge workers die on concurrent large HTML
 * bodies, so feeds are handled one at a time and articles in small serial
 * batches, with a hard per-invocation article cap.
 */
const MAX_SOURCES = 4;
const MAX_ITEMS_PER_SOURCE = 4;
const MAX_ARTICLES = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  let body: { userId?: unknown; sourceId?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const userId = auth.serviceRole
    ? (typeof body.userId === "string" ? body.userId : null)
    : auth.userId ?? null;
  if (!userId) return jsonResponse({ error: "user_required" }, 400);
  const onlySource = typeof body.sourceId === "string" ? body.sourceId : null;

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let q = db.from("mg_sources")
    .select("id,name,feed_url,active")
    .eq("user_id", userId)
    .eq("active", true)
    .order("last_fetched_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SOURCES);
  if (onlySource) q = db.from("mg_sources").select("id,name,feed_url,active").eq("user_id", userId).eq("id", onlySource);

  const { data: sources, error } = await q;
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!sources?.length) return jsonResponse({ processed: 0, results: [], note: "no_active_sources" });

  const results: unknown[] = [];
  let ingested = 0;

  for (const source of sources) {
    const xml = await fetchFeed(source.feed_url);
    if (!xml) {
      await db.from("mg_sources")
        .update({ last_error: "feed_unreachable", last_fetched_at: new Date().toISOString() })
        .eq("id", source.id);
      results.push({ source: source.name, error: "feed_unreachable" });
      continue;
    }
    const items = parseFeed(xml, MAX_ITEMS_PER_SOURCE * 3).slice(0, MAX_ITEMS_PER_SOURCE);

    // Skip URLs already ingested so a refresh spends its budget on new
    // pieces. Failed attempts are deliberately NOT skipped: extraction can
    // succeed later (site unblocked, snapshot appeared, feed now carries text).
    const { data: known } = await db.from("mg_articles")
      .select("url,error_message")
      .eq("user_id", userId)
      .eq("status", "processed")
      .in("url", items.map((i) => i.url));
    // Excerpt-only pieces stay eligible so a later run can upgrade them to
    // the full text once an archived copy exists.
    const seen = new Set(
      (known ?? [])
        .filter((r: { error_message: string | null }) => r.error_message !== "feed_excerpt_only")
        .map((r: { url: string }) => r.url),
    );

    for (const item of items) {
      if (ingested >= MAX_ARTICLES) break;
      if (seen.has(item.url)) continue;
      const outcome = await ingestUrl(db, userId, item.url, source.id, {
        title: item.title,
        publishedAt: item.publishedAt,
        author: item.author,
        fallbackText: item.content,
      });
      results.push({ source: source.name, ...outcome });
      if (outcome.status === "processed") ingested++;
    }

    await db.from("mg_sources")
      .update({ last_error: null, last_fetched_at: new Date().toISOString() })
      .eq("id", source.id);

    if (ingested >= MAX_ARTICLES) break;
  }

  return jsonResponse({ processed: ingested, results });
});
