import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { ingestUrl } from "../_shared/marginaliaPipeline.ts";
import { corsHeaders, isSafeUrl, jsonResponse, requireUser } from "../_shared/rss-utils.ts";

/**
 * mg-add-article — synchronous single-URL ingestion for the Archive view.
 * Runs the same pipeline as the daily job so the pasted article lands
 * fully processed (summary, tags, embedded chunks) before we respond.
 */
const HOURLY_ARTICLE_LIMIT = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  const userId = auth.userId;
  if (!userId) return jsonResponse({ error: "user_required" }, 401);

  let body: { url?: unknown; sourceId?: unknown };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || url.length > 2000 || !isSafeUrl(url)) {
    return jsonResponse({ error: "invalid_url" }, 400);
  }
  const sourceId = typeof body.sourceId === "string" ? body.sourceId : null;

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Per-user ingestion cap: each call fans out into outbound fetches and
  // paid model/embedding calls, so bound how many one account can trigger.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await db
    .from("mg_articles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (countError) return jsonResponse({ error: "quota_check_failed" }, 503);
  if ((count ?? 0) >= HOURLY_ARTICLE_LIMIT) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  try {
    const outcome = await ingestUrl(db, userId, url, sourceId);
    // Always 200: a failed extraction is a normal outcome the UI explains,
    // not a transport error that should blow up the client.
    return jsonResponse({ outcome }, 200);
  } catch (e) {
    const message = (e as Error).message;
    console.error(JSON.stringify({ event: "add_article_failed", url, error: message }));
    return jsonResponse({ error: "ingest_failed" }, 500);
  }
});
