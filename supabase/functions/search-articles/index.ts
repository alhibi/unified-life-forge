import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  corsHeaders,
  jsonResponse,
  optionalUser,
} from "../_shared/rss-utils.ts";

/**
 * search-articles — invokes the search_rss_articles SQL RPC for
 * tsvector-ranked full-text search across the entire RSS archive,
 * optionally restricted to a list of source names.
 *
 * Design notes:
 *  - The function is intentionally **public-readable**. The RPC is
 *    `GRANT EXECUTE ... TO anon`, the underlying `rss_articles` table
 *    has the policy "Anyone can read articles", and the search input
 *    surfaces no PII. So we accept anonymous callers (`optionalUser`)
 *    rather than gating with `requireUser` — historically that gate
 *    fired for every signed-out browser because the bearer is the
 *    project anon key, not a session JWT, and `auth.getUser(anonKey)`
 *    always rejects.
 *  - **Validation errors degrade to 200 + empty results.** A blank
 *    query, a too-short query, or a malformed JSON body should not
 *    surface as "Edge Function returned a non-2xx status code" in the
 *    UI — they should look like "no matches" with a helpful note.
 *    Genuine system failures (DB unavailable, RPC error) still return
 *    5xx and include the underlying message in the JSON body so the
 *    client can show it instead of the generic supabase-js fallback.
 *  - We forward the caller's bearer to the RPC client so the SQL
 *    function executes with the caller's RLS context (matches the
 *    SECURITY INVOKER intent of the RPC definition).
 */

interface SearchRow {
  link: string;
  title: string;
  description: string;
  pub_date: string | null;
  image: string | null;
  source_name: string;
  rank: number;
}

/** Empty payload shape — used for every "soft" failure so the client
 *  can render uniformly (no special-casing per error). */
function emptyResult(query: string, note?: string) {
  return jsonResponse({
    query,
    count: 0,
    results: [] as SearchRow[],
    ...(note ? { note } : {}),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Public read — anonymous callers are welcome.
  const auth = await optionalUser(req);

  // Parse body. A malformed body becomes an empty result set, not a
  // 4xx — the UI's "no matches for X" surface is far less alarming
  // than a red banner saying the function returned a non-2xx code.
  let body: {
    q?: unknown;
    sources?: unknown;
    limit?: unknown;
    since?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return emptyResult("", "Invalid JSON body");
  }

  const q = typeof body.q === "string" ? body.q.trim() : "";
  if (q.length < 2) {
    return emptyResult(q, "Query too short (min 2 chars)");
  }
  if (q.length > 200) {
    return emptyResult(q.slice(0, 200), "Query too long (max 200 chars)");
  }

  const sources = Array.isArray(body.sources)
    ? body.sources.filter((s): s is string => typeof s === "string")
    : null;
  // Disambiguate: an explicit empty array from the client means
  // "the user has no enabled feeds". Searching every source in that
  // state would surprise the user — return zero results instead.
  if (Array.isArray(body.sources) && (sources?.length ?? 0) === 0) {
    return emptyResult(q, "No sources enabled");
  }

  const limit = typeof body.limit === "number" && Number.isFinite(body.limit)
    ? Math.max(1, Math.min(200, Math.floor(body.limit)))
    : 50;

  // since: ISO-8601 string. The page sends "today"/"week"/"month" as
  // ISO timestamps after computing them client-side, so we don't have
  // to pull a date library into the edge function. NULL = no limit.
  let sinceIso: string | null = null;
  if (typeof body.since === "string") {
    const parsed = Date.parse(body.since);
    if (!Number.isNaN(parsed)) sinceIso = new Date(parsed).toISOString();
  }

  // Build a supabase client. If we have any usable bearer (session
  // JWT, anon key, or service role), forward it; otherwise fall back
  // to the function's own anon key so RLS still permits public
  // article reads.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({
      error: "Server misconfigured: missing SUPABASE_URL or anon key",
    }, 500);
  }

  const sb = createClient(
    supabaseUrl,
    anonKey,
    auth.token
      ? { global: { headers: { Authorization: `Bearer ${auth.token}` } } }
      : {},
  );

  try {
    const { data, error } = await sb.rpc("search_rss_articles", {
      q,
      src_names: sources && sources.length > 0 ? sources : null,
      max_rows: limit,
      since_at: sinceIso,
    });

    if (error) {
      // Surface the real Postgres message on the wire so the UI can
      // render a meaningful note ("...timed out", "...does not exist",
      // etc.) instead of the supabase-js generic fallback.
      console.error("[search-articles] rpc error:", error);
      return jsonResponse({
        error: error.message || "RPC failed",
        code: (error as { code?: string }).code ?? null,
        results: [],
        count: 0,
        query: q,
      }, 500);
    }

    const rows = (data as SearchRow[] | null) ?? [];
    return jsonResponse({
      query: q,
      count: rows.length,
      results: rows,
    });
  } catch (e) {
    console.error("[search-articles] unexpected error:", e);
    return jsonResponse({
      error: e instanceof Error ? e.message : String(e),
      results: [],
      count: 0,
      query: q,
    }, 500);
  }
});
