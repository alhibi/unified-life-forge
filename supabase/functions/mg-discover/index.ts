import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";
import { ANALYSIS_MODELS, callOpenRouter, safeJson } from "../_shared/marginalia.ts";

/**
 * mg-discover — the connection engine. Samples the archive across time and
 * domains, then asks one model per "lens" for non-obvious links between
 * articles that don't share vocabulary. Every claim is grounded in the
 * article ids we sent, and anything the model can't ground is dropped.
 */
const LENSES = [
  {
    key: "structural",
    prompt:
      "Find shared underlying STRUCTURE or mechanism between articles from different domains (feedback loops, scaling laws, incentive traps). Reject links that merely share a topic or keyword.",
  },
  {
    key: "tension",
    prompt:
      "Find genuine TENSIONS or contradictions: articles whose claims cannot both be fully true, or where one's assumption is the other's blind spot.",
  },
  {
    key: "lineage",
    prompt:
      "Find intellectual LINEAGE: one article's idea is an ancestor, mutation, or unacknowledged repetition of another's.",
  },
] as const;

const SYSTEM = (lens: string) =>
  `You are a careful research companion reading someone's personal archive.
${lens}

Rules:
- Only use the ARTICLES listed. Reference them by their numeric index.
- A connection must join 2 or 3 DIFFERENT articles.
- No connection is better than a weak one. Return fewer, sharper items.
- novelty: 1-10, how non-obvious the link is. Anything under 5 must be omitted.
- confidence: "speculative" | "plausible" | "strong".
Return ONLY JSON: {"connections":[{"indices":[1,4],"connection":"…","why_it_matters":"…","novelty":7,"confidence":"plausible"}]}
Write "connection" and "why_it_matters" in Arabic.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  let body: { userId?: unknown; lenses?: unknown } = {};
  try { body = await req.json(); } catch { /* optional */ }
  const userId = auth.serviceRole
    ? (typeof body.userId === "string" ? body.userId : null)
    : auth.userId ?? null;
  if (!userId) return jsonResponse({ error: "user_required" }, 400);
  const requested = Array.isArray(body.lenses)
    ? LENSES.filter((l) => (body.lenses as unknown[]).includes(l.key))
    : LENSES;
  const lenses = requested.length ? requested : LENSES;

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Sample the archive: newest first, then a spread of older pieces so
  //    discovery isn't trapped in this week's reading.
  const { data: recent } = await db.from("mg_articles")
    .select("id,title,summary,domain_tags,published_at,url")
    .eq("user_id", userId).eq("status", "processed")
    .order("fetched_at", { ascending: false }).limit(14);
  const { data: older } = await db.from("mg_articles")
    .select("id,title,summary,domain_tags,published_at,url")
    .eq("user_id", userId).eq("status", "processed")
    .order("fetched_at", { ascending: true }).limit(14);

  const byId = new Map<string, ArticleRow>();
  for (const a of [...(recent ?? []), ...(older ?? [])]) byId.set(a.id, a);
  const pool = [...byId.values()];
  if (pool.length < 4) {
    return jsonResponse({ created: 0, note: "need_more_articles", have: pool.length });
  }

  const digest = pool.map((a, i) =>
    `[${i + 1}] ${a.title ?? "(untitled)"} — tags: ${(a.domain_tags ?? []).join(", ") || "none"}\n${(a.summary ?? "").slice(0, 700)}`
  ).join("\n\n");

  // Existing connections, so we don't re-surface the same pairing.
  const { data: existing } = await db.from("mg_connections")
    .select("article_ids").eq("user_id", userId).limit(400);
  const seenPairs = new Set(
    (existing ?? []).map((c: { article_ids: string[] }) => [...c.article_ids].sort().join("|")),
  );

  const settled = await Promise.allSettled(lenses.map((lens) =>
    callOpenRouter(
      [
        { role: "system", content: SYSTEM(lens.prompt) },
        { role: "user", content: `ARTICLES:\n\n${digest}` },
      ],
      { json: true, temperature: 0.8, maxTokens: 1800, models: ANALYSIS_MODELS },
    ).then((r) => ({ lens: lens.key, ...r }))
  ));

  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (const outcome of settled) {
    if (outcome.status === "rejected") {
      errors.push(String(outcome.reason?.message ?? outcome.reason));
      continue;
    }
    const { lens, text, model } = outcome.value;
    const parsed = safeJson<{ connections?: RawConnection[] }>(text);
    for (const c of parsed?.connections ?? []) {
      const ids = (c.indices ?? [])
        .map((n) => pool[Number(n) - 1]?.id)
        .filter((v): v is string => Boolean(v));
      const unique = [...new Set(ids)];
      if (unique.length < 2 || unique.length > 3) continue;
      const novelty = Math.round(Number(c.novelty) || 0);
      if (novelty < 5) continue;
      const key = [...unique].sort().join("|");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      const confidence = ["speculative", "plausible", "strong"].includes(String(c.confidence))
        ? String(c.confidence)
        : "speculative";
      const connection_text = String(c.connection ?? "").trim();
      if (connection_text.length < 40) continue;
      rows.push({
        user_id: userId,
        article_ids: unique,
        lens,
        connection_text: connection_text.slice(0, 4000),
        why_it_matters: (c.why_it_matters ?? "").toString().slice(0, 2000) || null,
        novelty_score: Math.min(10, Math.max(1, novelty)),
        confidence_label: confidence,
        status: "new",
        model_used: model,
      });
    }
  }

  if (rows.length) {
    const { error } = await db.from("mg_connections").insert(rows);
    if (error) return jsonResponse({ error: error.message, errors }, 500);
  }

  return jsonResponse({ created: rows.length, sampled: pool.length, errors });
});

interface ArticleRow {
  id: string;
  title: string | null;
  summary: string | null;
  domain_tags: string[] | null;
  published_at: string | null;
  url: string;
}
interface RawConnection {
  indices?: number[];
  connection?: string;
  why_it_matters?: string;
  novelty?: number | string;
  confidence?: string;
}
