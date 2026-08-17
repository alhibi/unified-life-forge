import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";

interface OpenRouterModelRaw {
  id: string;
  name?: string;
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

interface FormattedModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: number; // USD per 1M tokens
    completion: number; // USD per 1M tokens
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Admin authentication check
  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  const userId = auth.userId;
  if (!userId) return jsonResponse({ error: "user_required" }, 401);

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "OPENROUTER_API_KEY is not configured on server" }, 500);
  }

  let searchQuery = "";
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body.query === "string") searchQuery = body.query.trim().toLowerCase();
    } catch {
      // Ignore body parsing errors for empty GET/POST
    }
  } else {
    const url = new URL(req.url);
    searchQuery = (url.searchParams.get("query") || "").trim().toLowerCase();
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

    for (const model of rawModels) {
      const modality = model.architecture?.modality || "";
      const inputMods = model.architecture?.input_modalities || [];
      const outputMods = model.architecture?.output_modalities || [];

      // Exclude non-text, embedding, or pure image generation models
      const isEmbedding = model.id.includes("embed") || modality.includes("embedding");
      const isImageOnly = modality.includes("image->image") || (outputMods.length === 1 && outputMods[0] === "image");

      if (isEmbedding || isImageOnly) {
        continue;
      }

      // Convert pricing string (e.g. "0.0000015") per token to per 1M tokens
      const promptCostPerToken = parseFloat(String(model.pricing?.prompt ?? "0")) || 0;
      const completionCostPerToken = parseFloat(String(model.pricing?.completion ?? "0")) || 0;

      const promptPer1M = promptCostPerToken * 1000000;
      const completionPer1M = completionCostPerToken * 1000000;

      const formatted: FormattedModel = {
        id: model.id,
        name: model.name || model.id,
        context_length: model.context_length || 4096,
        pricing: {
          prompt: Math.round(promptPer1M * 1000) / 1000,
          completion: Math.round(completionPer1M * 1000) / 1000,
        },
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

    // Sort models with popular text models (anthropic, openai, google, deepseek, qwen, llama) near top
    textModels.sort((a, b) => {
      const priorityPrefixes = ["anthropic/", "openai/", "google/", "deepseek/", "qwen/", "meta-llama/"];
      const aIndex = priorityPrefixes.findIndex((p) => a.id.startsWith(p));
      const bIndex = priorityPrefixes.findIndex((p) => b.id.startsWith(p));

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

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
