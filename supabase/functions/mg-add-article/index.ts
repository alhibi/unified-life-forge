import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, isSafeUrl, jsonResponse, requireUser } from "../_shared/rss-utils.ts";
import { ingestUrl } from "../_shared/marginaliaPipeline.ts";

/**
 * mg-add-article — synchronous single-URL ingestion for the Archive view.
 * Runs the same pipeline as the daily job so the pasted article lands
 * fully processed (summary, tags, embedded chunks) before we respond.
 */
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

  try {
    const outcome = await ingestUrl(db, userId, url, sourceId);
    return jsonResponse({ outcome }, outcome.status === "error" ? 422 : 200);
  } catch (e) {
    const message = (e as Error).message;
    console.error(JSON.stringify({ event: "add_article_failed", url, error: message }));
    return jsonResponse({ error: message }, 500);
  }
});
