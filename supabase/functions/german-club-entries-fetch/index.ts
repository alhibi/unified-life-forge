import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/rss-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Parse input params (GET query params or POST body)
  let shelfId = "";
  let shelfSlug = "";
  let page = 1;
  let pageSize = 20;

  if (req.method === "GET") {
    const url = new URL(req.url);
    shelfId = url.searchParams.get("shelf_id") || "";
    shelfSlug = url.searchParams.get("shelf_slug") || "";
    page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    pageSize = Math.min(Math.max(parseInt(url.searchParams.get("page_size") || "20", 10), 1), 50);
  } else {
    try {
      const body = await req.json();
      shelfId = typeof body.shelf_id === "string" ? body.shelf_id : "";
      shelfSlug = typeof body.shelf_slug === "string" ? body.shelf_slug : "";
      page = Math.max(typeof body.page === "number" ? body.page : 1, 1);
      pageSize = Math.min(Math.max(typeof body.page_size === "number" ? body.page_size : 20, 1), 50);
    } catch {
      /* ignore empty json */
    }
  }

  if (!shelfId && !shelfSlug) {
    return jsonResponse({ error: "shelf_id_or_slug_required" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Fetch shelf details
  let shelfQuery = db.from("german_club_shelves").select("*");
  if (shelfId) {
    shelfQuery = shelfQuery.eq("id", shelfId);
  } else {
    shelfQuery = shelfQuery.eq("slug", shelfSlug);
  }

  const { data: shelf, error: shelfErr } = await shelfQuery.maybeSingle();

  if (shelfErr || !shelf) {
    return jsonResponse({ error: "shelf_not_found" }, 404);
  }

  // 2. Fetch reviewed/verified entries
  const fromOffset = (page - 1) * pageSize;
  const toOffset = fromOffset + pageSize - 1;

  const { data: entries, count, error: entriesErr } = await db
    .from("german_club_entries")
    .select("*", { count: "exact" })
    .eq("shelf_id", shelf.id)
    .in("review_status", ["reviewed", "verified"])
    .order("sort_order", { ascending: true })
    .range(fromOffset, toOffset);

  if (entriesErr) {
    return jsonResponse({ error: entriesErr.message }, 500);
  }

  const totalEntries = count ?? 0;
  const processedEntries = (entries ?? []).map((entry) => ({
    ...entry,
    locked: false,
  }));

  return jsonResponse({
    shelf: {
      ...shelf,
      is_premium: false,
    },
    is_entitled: true,
    page,
    page_size: pageSize,
    total_entries: totalEntries,
    entries: processedEntries,
  });
});
