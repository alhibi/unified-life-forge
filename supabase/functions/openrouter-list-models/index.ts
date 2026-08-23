import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";

interface OpenRouterModelRaw {
  id: string;
  name?: string;
  created?: number;
  context_length?: number;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

interface ModelPerformanceInfo {
  shelf_acceptance_rate?: number;
  shelf_total_generated?: number;
  overall_acceptance_rate?: number;
  overall_total_generated?: number;
  badge_text?: string;
}

interface FormattedModel {
  id: string;
  name: string;
  created: number;
  released_at: string | null;
  is_recent: boolean;
  context_length: number;
  pricing: {
    prompt: number; // USD per 1M tokens
    completion: number; // USD per 1M tokens
  };
  performance?: ModelPerformanceInfo | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  const userId = auth.userId;
  if (!userId) return jsonResponse({ error: "user_required" }, 401);

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "OPENROUTER_API_KEY is not configured on server" }, 500);
  }

  let searchQuery = "";
  let shelfId = "";

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body.query === "string") searchQuery = body.query.trim().toLowerCase();
      if (typeof body.shelf_id === "string") shelfId = body.shelf_id.trim();
      else if (typeof body.shelfId === "string") shelfId = body.shelfId.trim();
    } catch {
      // Ignore body parsing errors for empty GET/POST
    }
  } else {
    const url = new URL(req.url);
    searchQuery = (url.searchParams.get("query") || "").trim().toLowerCase();
    shelfId = (url.searchParams.get("shelf_id") || url.searchParams.get("shelfId") || "").trim();
  }

  // Fetch model performance stats from Supabase DB
  const statsByModel: Record<string, {
    shelfStats?: { generated: number; accepted: number };
    overallStats: { generated: number; accepted: number };
  }> = {};

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: statsRows } = await db.from("model_performance_stats").select("*");

    if (statsRows && statsRows.length > 0) {
      for (const row of statsRows) {
        const mId = row.model_id;
        if (!statsByModel[mId]) {
          statsByModel[mId] = { overallStats: { generated: 0, accepted: 0 } };
        }
        statsByModel[mId].overallStats.generated += row.total_generated || 0;
        statsByModel[mId].overallStats.accepted += row.total_accepted || 0;

        if (shelfId && row.shelf_id === shelfId) {
          statsByModel[mId].shelfStats = {
            generated: row.total_generated || 0,
            accepted: row.total_accepted || 0,
          };
        }
      }
    }
  } catch (err) {
    console.error("Error loading model_performance_stats:", err);
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://smarthub.app",
        "X-Title": "SmartHub Admin",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return jsonResponse({ error: `OpenRouter API error: ${res.status}`, raw: errText }, 502);
    }

    const data = (await res.json()) as { data?: OpenRouterModelRaw[] };
    const rawModels = data.data || [];

    // Filter to text/chat capable models only
    const textModels: FormattedModel[] = [];
    const recentCutoffMs = Date.now() - 1000 * 60 * 60 * 24 * 240;

    for (const model of rawModels) {
      const modality = model.architecture?.modality || "";
      const outputMods = model.architecture?.output_modalities || [];

      // Exclude non-text, embedding, or pure image generation models
      const isEmbedding = model.id.includes("embed") || modality.includes("embedding");
      const isImageOnly = modality.includes("image->image") ||
        (outputMods.length === 1 && outputMods[0] === "image");

      if (isEmbedding || isImageOnly) {
        continue;
      }

      // Convert pricing string (e.g. "0.0000015") per token to per 1M tokens
      const promptCostPerToken = parseFloat(String(model.pricing?.prompt ?? "0")) || 0;
      const completionCostPerToken = parseFloat(String(model.pricing?.completion ?? "0")) || 0;

      const promptPer1M = promptCostPerToken * 1000000;
      const completionPer1M = completionCostPerToken * 1000000;

      // Determine performance badge
      let perfInfo: ModelPerformanceInfo | null = null;
      const mStats = statsByModel[model.id];
      if (mStats) {
        if (mStats.shelfStats && mStats.shelfStats.generated > 0) {
          const rate = Math.round((mStats.shelfStats.accepted / mStats.shelfStats.generated) * 100);
          perfInfo = {
            shelf_acceptance_rate: rate,
            shelf_total_generated: mStats.shelfStats.generated,
            badge_text: `${rate}% قبول على هذا الرف تحديداً`,
          };
        } else if (mStats.overallStats.generated > 0) {
          const rate = Math.round((mStats.overallStats.accepted / mStats.overallStats.generated) * 100);
          perfInfo = {
            overall_acceptance_rate: rate,
            overall_total_generated: mStats.overallStats.generated,
            badge_text: `${rate}% قبول إجمالاً`,
          };
        }
      }

      const createdTs = typeof model.created === "number" ? model.created : 0;
      const createdMs = createdTs > 0 ? createdTs * 1000 : 0;

      const formatted: FormattedModel = {
        id: model.id,
        name: model.name || model.id,
        created: createdTs,
        released_at: createdMs ? new Date(createdMs).toISOString() : null,
        is_recent: createdMs > recentCutoffMs,
        context_length: model.context_length || 4096,
        pricing: {
          prompt: Math.round(promptPer1M * 1000) / 1000,
          completion: Math.round(completionPer1M * 1000) / 1000,
        },
        performance: perfInfo,
      };

      if (
        searchQuery &&
        !formatted.id.toLowerCase().includes(searchQuery) &&
        !formatted.name.toLowerCase().includes(searchQuery)
      ) {
        continue;
      }

      textModels.push(formatted);
    }

    // Newest releases first — the furnace must surface current-generation models.
    textModels.sort((a, b) => {
      if (b.created !== a.created) return b.created - a.created;
      return a.id.localeCompare(b.id);
    });

    return jsonResponse({
      models: textModels,
      count: textModels.length,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
