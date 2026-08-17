import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";

const DEFAULT_PRODUCT_SLUG = "german_club_premium";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  const userId = auth.userId;
  if (!userId) return jsonResponse({ error: "user_required" }, 401);

  let productSlug = DEFAULT_PRODUCT_SLUG;

  if (req.method === "GET") {
    const url = new URL(req.url);
    const slug = url.searchParams.get("product_slug");
    if (slug) productSlug = slug;
  } else {
    try {
      const body = await req.json();
      if (typeof body.product_slug === "string" && body.product_slug.trim()) {
        productSlug = body.product_slug.trim();
      }
    } catch {
      /* ignore */
    }
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: entitlement, error } = await db
    .from("premium_entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("product_slug", productSlug)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const isActive = Boolean(
    entitlement &&
      entitlement.is_active &&
      (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date())
  );

  return jsonResponse({
    user_id: userId,
    product_slug: productSlug,
    is_active: isActive,
    entitlement: entitlement || null,
  });
});
