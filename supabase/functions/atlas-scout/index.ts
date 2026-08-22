// Atlas Scout — deep place-research pipeline via OpenRouter.
//
// v2 rewrite: the first pass (b100f7f1) worked against a table that does not
// exist (travel_places), had no timeouts/retries, wrote dossiers strictly
// serially, re-filed the same places on every run, and left zombie runs
// behind whenever the client disconnected. This version:
//
//   1. GEOCODE   resolve the target to a real city/country (Nominatim,
//                timeout + one retry, never fatal).
//   2. DISCOVER  model (:online) maps the target into distinct candidate
//                places — restaurants, parks, adventures, hidden gems.
//   3. DEDUP     candidates are keyed by script-folded name and dropped when
//                the user already holds that dossier for this target.
//   4. DEPTH     per place, a focused research pass with web access writes
//                the full dossier; runs with bounded concurrency, per-call
//                timeout and one retry on transient failures.
//   5. FILE      rows land in atlas_scout_places; the run row is finalised
//                even when the client stream is already gone (no zombies).
//
// All decisions (normalisation, dedup keys, validation, prompt contracts)
// live in the pure core shared with the web app:
// ../_shared/atlasScoutPipeline.ts → src/features/travel-atlas/lib/scoutPipeline.ts
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  type DossierDraft,
  DEPTH_POLICY,
  discoverySystemPrompt,
  dossierSystemPrompt,
  isFulfillable,
  parseDiscoveryItem,
  parseDossier,
  placeKey,
  scopeNoteFor,
  type ScoutDepth,
} from "../_shared/atlasScoutPipeline.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");

const MODELS: Record<"flash" | "pro", string> = {
  flash: "google/gemini-2.5-flash",
  pro: "google/gemini-2.5-pro",
};

/** Hard ceiling per LLM call — a hung call must not hang the whole run. */
const LLM_TIMEOUT_MS = 90_000;
/** Nominatim is a free service; be quick and gentle with it. */
const GEOCODE_TIMEOUT_MS = 10_000;
/** Whole-run ceiling so a wedged function cannot burn quota forever. */
const RUN_BUDGET_MS = 8 * 60_000;
const runDeadline = Date.now() + RUN_BUDGET_MS;

interface RequestBody {
  targetId?: string;
  query?: string;
  kind?: string;
  displayNameAr?: string;
  depth?: ScoutDepth;
}

/* ── Resilient fetch ─────────────────────────────────────────────────────── */

async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retries = 1,
): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (Date.now() > runDeadline) {
      throw new Error("انتهت ميزانية زمن المهمة — قلّل العمق أو حاول لاحقاً");
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      // 429/5xx are transient by nature — back off and try again.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 + 1200 * attempt));
        continue;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600 + 900 * attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function callOpenRouter(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  json = false,
  online = false,
): Promise<string> {
  const fullModel = online && !model.endsWith(":online") ? `${model}:online` : model;
  const j = (await fetchJsonWithRetry(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://amv.life",
        "X-Title": "SmartHub Atlas Scout",
      },
      body: JSON.stringify({
        model: fullModel,
        max_tokens: maxTokens,
        temperature: json ? 0.3 : 0.7,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
    LLM_TIMEOUT_MS,
  )) as { choices?: Array<{ message?: { content?: string } }> };

  const content = j?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("رد فارغ من النموذج");
  return content;
}

async function callJSON<T>(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  online = false,
): Promise<T> {
  const raw = await callOpenRouter(model, system, user, maxTokens, true, online);
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Tolerate fenced code fences some models emit despite response_format.
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("رد النموذج ليس JSON صالحاً");
    return JSON.parse(m[0]) as T;
  }
}

async function geocodeTarget(
  query: string,
): Promise<{ lat: number; lng: number; nameEn: string } | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=ar`;
    const j = (await fetchJsonWithRetry(
      url,
      { headers: { "User-Agent": "SmartHub-AtlasScout/1.1 (amv.life)" } },
      GEOCODE_TIMEOUT_MS,
    )) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const hit = Array.isArray(j) ? j[0] : null;
    if (!hit?.lat || !hit?.lon) return null;
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, nameEn: hit.display_name?.split(",")[0] ?? query };
  } catch {
    // Geocoding only enriches the run (address line, city scope) — never fatal.
    return null;
  }
}

/* ── SSE plumbing ────────────────────────────────────────────────────────── */

type Emitter = (event: string, data: unknown) => void;

function makeSse(controller: ReadableStreamDefaultController): Emitter {
  return (event, data) => {
    try {
      controller.enqueue(
        new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      );
    } catch {
      // Client vanished mid-stream — keep working; the DB still gets everything.
    }
  };
}

function safeClose(controller: ReadableStreamDefaultController) {
  try {
    controller.close();
  } catch {
    /* already closed */
  }
}

/* ── Row typing over the untyped client tables ───────────────────────────── */

interface ScoutPlaceInsert {
  run_id: string;
  target_id: string;
  user_id: string;
  name_en: string;
  name_ar: string | null;
  category: string;
  vibe: string | null;
  coordinates: { lng: number; lat: number } | null;
  address_line: string | null;
  city: string | null;
  description_ar: string;
  atmosphere_ar: string | null;
  tips_ar: string | null;
  best_months: number[];
  duration_minutes: number | null;
  price_level: number | null;
  signature_dish: string | null;
  photo_query_en: string;
  sources: string[];
}

interface PlaceRowLite {
  name_en: string | null;
  name_ar: string | null;
}

/** Bounded-concurrency worker pool — keeps throughput without stampeding the API. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase: SupabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "غير مصرح" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "طلب غير صالح" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { targetId, query, kind } = body;
  const depth: ScoutDepth =
    body.depth === "standard" || body.depth === "deepest" ? body.depth : "deep";
  if (!targetId || !query || !["city", "country"].includes(kind ?? "")) {
    return new Response(JSON.stringify({ error: "معطيات ناقصة" }), {
      status: 400,
      headers: corsHeaders,
    });
  }
  if (!OPENROUTER_KEY) {
    return new Response(JSON.stringify({ error: "خادم غير مهيأ: OPENROUTER_API_KEY مفقود" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const policy = DEPTH_POLICY[depth];
  const model = MODELS[policy.modelTier];

  const stream = new ReadableStream({
    async start(controller) {
      const sse = makeSse(controller);
      let runId: string | null = null;

      // Runs must reach a terminal state even if the client disconnects —
      // every stage below writes its outcome to the DB before touching SSE.
      const finalize = async (patch: {
        status: "completed" | "failed";
        places_found?: number;
        error_message?: string | null;
      }) => {
        if (!runId) return;
        await supabase
          .from("atlas_scout_runs")
          .update({
            status: patch.status,
            places_found: patch.places_found ?? 0,
            completed_at: new Date().toISOString(),
            error_message: patch.error_message ?? null,
          })
          .eq("id", runId);
      };

      try {
        // ── Create the run row ──────────────────────────────────────────
        const { data: runRow, error: runErr } = await supabase
          .from("atlas_scout_runs")
          .insert({ target_id: targetId, user_id: user.id, status: "researching", model })
          .select("id")
          .single();
        if (runErr || !runRow) {
          throw new Error(`فشل إنشاء مهمة الكشف: ${runErr?.message ?? "بلا تفاصيل"}`);
        }
        runId = runRow.id as string;

        // ── Stage 1: geocode (best effort) ──────────────────────────────
        sse("stage", { stage: "geocode", message: `نحدد موقع "${query}" على الخريطة…` });
        const geo = await geocodeTarget(query);

        // Stamp resolved coordinates onto the watch target so future runs
        // skip straight past this step.
        if (geo && kind === "city") {
          await supabase
            .from("atlas_watch_targets")
            .update({ center_lng: geo.lng, center_lat: geo.lat })
            .eq("id", targetId)
            .eq("user_id", user.id);
        }

        // ── Stage 2: discovery ──────────────────────────────────────────
        sse("stage", {
          stage: "discover",
          message: `نبحث بعمق في أرجاء ${body.displayNameAr ?? query}…`,
        });
        const scopeNote = scopeNoteFor(kind, query, geo?.nameEn ?? null);

        const discovery = await callJSON<{ places?: unknown[] }>(
          model,
          discoverySystemPrompt(),
          `${scopeNote}\nأريد ${policy.places} مكاناً متنوعاً.`,
          4000,
          true, // online: ground the list in reality
        );

        const candidates = (discovery.places ?? [])
          .map(parseDiscoveryItem)
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .slice(0, policy.places);
        if (candidates.length === 0) {
          throw new Error("لم يعثر البحث على أماكن — جرّب صياغة أخرى");
        }

        // ── Stage 3: dedup against what the user already has ────────────
        const { data: existingRows, error: exErr } = await supabase
          .from("atlas_scout_places")
          .select("name_en,name_ar")
          .eq("target_id", targetId)
          .eq("user_id", user.id);
        if (exErr) throw new Error(`تعذر فحص السجل الحالي: ${exErr.message}`);

        const seen = new Set<string>();
        for (const row of existingRows ?? []) {
          const p = row as PlaceRowLite;
          if (p.name_en) seen.add(placeKey(p.name_en));
          if (p.name_ar) seen.add(placeKey(p.name_ar));
        }

        const fresh = candidates.filter((c) => {
          const keys = [placeKey(c.name_en)];
          if (c.name_ar) keys.push(placeKey(c.name_ar));
          return !keys.some((k) => k.length > 0 && seen.has(k));
        });

        // In-run duplicates collapse too (models love repeating themselves).
        const uniqueFresh: typeof fresh = [];
        const inRun = new Set<string>();
        for (const c of fresh) {
          const key = placeKey(c.name_en);
          if (!inRun.has(key)) {
            inRun.add(key);
            uniqueFresh.push(c);
          }
        }

        const skippedDuplicates = candidates.length - uniqueFresh.length;
        if (uniqueFresh.length === 0) {
          await finalize({
            status: "completed",
            places_found: 0,
            error_message: `كل الأماكن (${candidates.length}) موجودة في سجلك مسبقاً`,
          });
          sse("done", { filed: 0, total: candidates.length, failed: 0, duplicates: skippedDuplicates });
          safeClose(controller);
          return;
        }
        sse("stage", {
          stage: "dedup",
          message: skippedDuplicates > 0
            ? `${uniqueFresh.length} مكاناً جديداً بعد استبعاد ${skippedDuplicates} مكرر`
            : `${uniqueFresh.length} مكاناً جديداً كله`,
        });

        // ── Stage 4: parallel dossier writing ───────────────────────────
        let doneCount = 0;
        let filed = 0;
        let failed = 0;

        const rowsToInsert = await mapPool(uniqueFresh, policy.concurrency, async (c, i) => {
          const label = c.name_ar || c.name_en;
          try {
            const raw = await callJSON<unknown>(
              model,
              dossierSystemPrompt(),
              `المكان: ${c.name_en}${c.name_ar ? ` (${c.name_ar})` : ""}\nالسياق: ${scopeNote}\nلماذا مميز: ${c.hint_ar ?? "غير محدد"}\nاكتب نحو ${policy.perPlaceWords} كلمة في الوصف.`,
              1800,
              true,
            );
            const draft: DossierDraft = parseDossier(raw, c.name_en);

            if (!isFulfillable(draft)) throw new Error("ملف بلا وصف");

            const coords = draft.coordinates;
            const row: ScoutPlaceInsert = {
              run_id: runId!,
              target_id: targetId,
              user_id: user.id,
              name_en: c.name_en,
              name_ar: c.name_ar,
              category: c.category,
              vibe: draft.vibe,
              coordinates: coords ? { lng: coords[0], lat: coords[1] } : null,
              address_line: geo && kind === "city" ? `${c.name_en}, ${geo.nameEn}` : null,
              city: kind === "city" ? (body.displayNameAr ?? query) : null,
              description_ar: draft.descriptionAr,
              atmosphere_ar: draft.atmosphereAr,
              tips_ar: draft.tipsAr,
              best_months: draft.bestMonths,
              duration_minutes: draft.durationMinutes,
              price_level: draft.priceLevel,
              signature_dish: draft.signatureDish,
              photo_query_en: draft.photoQueryEn ?? c.name_en,
              sources: draft.sources,
            };

            doneCount++;
            sse("progress", {
              stage: "depth",
              current: doneCount,
              total: uniqueFresh.length,
              index: i,
              message: `دوّنا «${label}»`,
            });
            return { ok: true as const, row };
          } catch {
            doneCount++;
            failed++;
            sse("progress", {
              stage: "depth",
              current: doneCount,
              total: uniqueFresh.length,
              index: i,
              message: `تعذر إكمال «${label}» — تجاوزناه`,
            });
            return { ok: false as const };
          }
        });

        // Insert successes sequentially — PostgREST is cheap, the LLM was not.
        for (const r of rowsToInsert) {
          if (!r.ok) continue;
          const { error } = await supabase.from("atlas_scout_places").insert(r.row);
          if (!error) filed++;
        }

        // ── Stage 5: finalize ───────────────────────────────────────────
        await finalize({
          status: filed > 0 ? "completed" : "failed",
          places_found: filed,
          error_message: filed === 0 ? "لم يُدوَّن أي مكان" : null,
        });

        sse("done", { filed, total: uniqueFresh.length, failed, duplicates: skippedDuplicates });
        safeClose(controller);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
        await finalize({ status: "failed", error_message: msg.slice(0, 300) });
        sse("error", { message: msg });
        safeClose(controller);
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
