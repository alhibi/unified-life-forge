import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  requireUser,
} from "../_shared/rss-utils.ts";

/**
 * search-articles — invokes the search_rss_articles SQL function
 * (defined in 20260516220000_rss_search.sql) to do tsvector-ranked
 * full-text search across the entire archive, optionally restricted
 * to a list of source names the user has currently enabled.
 *
 * The SQL function uses ts_rank so popular terms in a long article
 * don't drown out concise titles. We pass through the user's auth
 * token so the SECURITY INVOKER predicate respects RLS.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  let body: {
    q?: unknown;
    sources?: unknown;
    limit?: unknown;
    since?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const q = typeof body.q === "string" ? body.q.trim() : "";
  if (q.length < 2) {
    return jsonResponse({ error: "Query too short (min 2 chars)" }, 400);
  }
  if (q.length > 200) {
    return jsonResponse({ error: "Query too long" }, 400);
  }
  const sources = Array.isArray(body.sources)
    ? body.sources.filter((s): s is string => typeof s === "string")
    : null;
  // Disambiguate: an explicit empty array from the client means
  // "the user has no enabled feeds". Searching every source in that
  // state would surprise the user — return zero results instead.
  if (Array.isArray(body.sources) && (sources?.length ?? 0) === 0) {
    return jsonResponse({
      query: q,
      count: 0,
      results: [],
    });
  }
  const limit = typeof body.limit === "number"
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

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
  );

  const { data, error } = await sb.rpc("search_rss_articles", {
    q,
    src_names: sources && sources.length > 0 ? sources : null,
    max_rows: limit,
    since_at: sinceIso,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    query: q,
    count: (data as SearchRow[] | null)?.length ?? 0,
    results: data ?? [],
  });
});
