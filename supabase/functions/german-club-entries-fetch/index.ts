import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";

const PRODUCT_SLUG = "german_club_premium";
const FREE_PREVIEW_LIMIT = 2;

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

  // Authenticate user optionally
  const auth = await requireUser(req);
  const userId = auth.ok ? auth.userId : null;

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

  // 2. Check entitlement
  let isEntitled = false;

  if (!shelf.is_premium) {
    isEntitled = true;
  } else if (userId) {
    const { data: ent } = await db
      .from("premium_entitlements")
      .select("is_active, expires_at")
      .eq("user_id", userId)
      .eq("product_slug", PRODUCT_SLUG)
      .maybeSingle();

    if (ent && ent.is_active) {
      if (!ent.expires_at || new Date(ent.expires_at) > new Date()) {
        isEntitled = true;
      }
    }
  }

  // 3. Fetch reviewed/verified entries
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

  // 4. Apply paywall preview locking if not entitled
  const totalEntries = count ?? 0;
  const processedEntries = (entries ?? []).map((entry, index) => {
    const globalIndex = fromOffset + index;
    const isLocked = !isEntitled && globalIndex >= FREE_PREVIEW_LIMIT;

    if (isLocked) {
      return {
        id: entry.id,
        shelf_id: entry.shelf_id,
        entry_type: entry.entry_type,
        gender: entry.gender,
        german_text: "🔒 " + entry.german_text.slice(0, 3) + "•••",
        arabic_translation: "محتوى حصري لأعضاء النادي الألماني",
        register: entry.register,
        is_separable_verb: entry.is_separable_verb,
        difficulty_level: entry.difficulty_level,
        locked: true,
      };
    }

    return {
      ...entry,
      locked: false,
    };
  });

  return jsonResponse({
    shelf,
    is_entitled: isEntitled,
    page,
    page_size: pageSize,
    total_entries: totalEntries,
    free_preview_limit: FREE_PREVIEW_LIMIT,
    entries: processedEntries,
  });
});
