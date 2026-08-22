// Atlas Scout — deep place-research pipeline via OpenRouter.
// Mirrors archive-generate's proven architecture: SSE progress events,
// staged generation, cheap-but-strong models, JSON-validated stages.
//
// Pipeline:
//   1. GEOCODE   resolve the target to a real city/country (Nominatim).
//   2. DISCOVER  model (:online) maps the target into distinct neighborhoods
//                of interest — restaurants, parks, adventures, hidden gems.
//   3. DEPTH     per place, a focused research pass with web access writes
//                the full dossier (atmosphere, tips, months, price, dish…).
//   4. FILE      rows land in atlas_scout_places; run row is finalized.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");

const MODELS: Record<string, string> = {
  flash: "google/gemini-2.5-flash",       // discovery + writing (cheap, strong)
  flashLite: "google/gemini-2.5-flash-lite", // geocode sanity + synthesis
  pro: "google/gemini-2.5-pro",           // reserved for deepest depth
};

type Depth = "standard" | "deep" | "deepest";
interface DepthPolicy {
  places: number;
  perPlaceWords: number;
  model: string;
}
const POLICY: Record<Depth, DepthPolicy> = {
  standard: { places: 8,  perPlaceWords: 130, model: MODELS.flash },
  deep:     { places: 14, perPlaceWords: 220, model: MODELS.flash },
  deepest:  { places: 20, perPlaceWords: 320, model: MODELS.pro },
};

interface RequestBody {
  targetId: string;
  query: string;
  kind: "city" | "country";
  displayNameAr?: string;
  depth?: Depth;
}

async function callOpenRouter(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  json = false,
  online = false
): Promise<string> {
  const fullModel = online && !model.endsWith(":online") ? `${model}:online` : model;
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`OpenRouter ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

async function callJSON<T>(model: string, system: string, user: string, maxTokens: number, online = false): Promise<T> {
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

function sse(controller: ReadableStreamDefaultWriter, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

/* ── Stage prompts ──────────────────────────────────────────────────────────── */

const CATEGORY_ENUM = ['nature','beach','viewpoint','historic','museum','religious','food','cafe','market','city','park','adventure','stay','culture','transport','other'];
const VIBE_ENUM = ['nature','food','adventure','culture','nightlife','family','budget','luxury'];

function discoverySystem(): string {
  return `أنت باحث جغرافي خبير يجمع أماكن استثنائية. ستتلقى مدينة أو دولة، ومطلوبك إخراج قائمة أماكن متنوعة الفئات (مطاعم مميزة، حدائق ومناطق طبيعية، مغامرات، معالم ثقافية وتاريخية، مقاهي، أسواق، نقاط إطلالة). القاعدة الذهبية:
- كل مكان يجب أن يكون حقيقياً موجوداً فعلاً (لا اختراع).
- نوّع: لا تكرر فئة واحدة أكثر من ثلث القائمة.
- فضّل الأماكن المحلية المميزة على السياحية البحتة، لكن ضع أهم معلم سياحي إن كان ضرورياً.
أخرج JSON فقط بالشكل: {"places":[{"name_en":"...","name_ar":"...","category":"one_of:${CATEGORY_ENUM.join('|')}","hint_ar":"سطر واحد لماذا مميزة"}]}`;
}

function dossierSystem(): string {
  return `أنت كاتب أدلة سفر محلي دقيق. ستتلقى اسماً لمكان حقيقي ومدينته، ومهمتك كتابة ملف غني بالعربية الفصحى المبسطة بناءً على معرفتك (وسيُمنح بحث ويب عند توفره). اكتب الوصف بحيث يشعر القارئ بالمكان قبل أن يزوره. أخرج JSON فقط بالشكل:
{"description_ar":"٣-٥ جمل","atmosphere_ar":"٢-٣ جمل عن الإحساس: الضوء والصوت والزحامة والروائح","tips_ar":"نصائح عملية: أفضل وقت، الحجز، المواصلات، الفخاخ السياحية","best_months":[1..12],"duration_minutes":number,"price_level":0-4,"vibe":"one_of:${VIBE_ENUM.join('|')}","signature_dish":"إن كانت مطعم/كافيه وإلا null","photo_query_en":"search phrase in English for a photo","coordinates":{"lng":number,"lat":number} أو null إذا غير متأكد,"sources":["ويكيبيديا","الموقع الرسمي"...]}`;
}

async function geocodeTarget(query: string): Promise<{ lat: number; lng: number; nameEn: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=ar`;
    const r = await fetch(url, { headers: { "User-Agent": "SmartHub-AtlasScout/1.0 (amv.life)" } });
    if (!r.ok) return null;
    const j = await r.json();
    const hit = Array.isArray(j) ? j[0] : null;
    if (!hit?.lat || !hit?.lon) return null;
    return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon), nameEn: hit.display_name?.split(",")[0] ?? query };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: corsHeaders });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "طلب غير صالح" }), { status: 400, headers: corsHeaders });
  }

  const { targetId, query, kind } = body;
  const depth: Depth = body.depth ?? "deep";
  if (!targetId || !query || !["city", "country"].includes(kind)) {
    return new Response(JSON.stringify({ error: "معطيات ناقصة" }), { status: 400, headers: corsHeaders });
  }
  if (!OPENROUTER_KEY) {
    return new Response(JSON.stringify({ error: "خادم غير مهيأ: OPENROUTER_API_KEY مفقود" }), { status: 500, headers: corsHeaders });
  }

  const policy = POLICY[depth];
  const stream = new ReadableStream({
    async start(controller) {
      let runId: string | null = null;
      try {
        sse(controller, "stage", { stage: "geocode", message: `نحدد موقع "${query}" على الخريطة…` });
        const geo = await geocodeTarget(query);

        // Create the run row
        const { data: runRow, error: runErr } = await supabase
          .from("atlas_scout_runs")
          .insert({ target_id: targetId, user_id: user.id, status: "researching", model: policy.model })
          .select("id")
          .single();
        if (runErr || !runRow) throw new Error(`فشل إنشاء مهمة الكشف: ${runErr?.message}`);
        runId = runRow.id;

        // ── Discovery ────────────────────────────────────────────────────
        sse(controller, "stage", { stage: "discover", message: `نبحث بعمق في أرجاء ${body.displayNameAr ?? query}…` });
        const scopeNote =
          kind === "country"
            ? `الدولة: ${query}. وزّع الأماكن على ٣-٥ مدن/مناطق مختلفة داخلها.`
            : `المدينة: ${query}${geo ? ` (${geo.nameEn})` : ""}. ركّز على أحيائها وضواحيها القريبة.`;
        const discovery = await callJSON<{ places: Array<{ name_en: string; name_ar: string; category: string; hint_ar: string }> }>(
          policy.model,
          discoverySystem(),
          `${scopeNote}\nأريد ${policy.places} مكاناً متنوعاً.`,
          4000,
          true // online: ground the list in reality
        );
        const candidates = (discovery.places ?? []).slice(0, policy.places);
        if (candidates.length === 0) throw new Error("لم يعثر البحث على أماكن — جرّب صياغة أخرى");

        // ── Per-place dossiers ───────────────────────────────────────────
        let filed = 0;
        for (let i = 0; i < candidates.length; i++) {
          const c = candidates[i];
          sse(controller, "progress", {
            stage: "depth",
            current: i + 1,
            total: candidates.length,
            message: `نكتب ملف «${c.name_ar || c.name_en}»…`,
          });
          try {
            const dossier = await callJSON<{
              description_ar: string;
              atmosphere_ar?: string;
              tips_ar?: string;
              best_months?: number[];
              duration_minutes?: number;
              price_level?: number;
              vibe?: string;
              signature_dish?: string | null;
              photo_query_en?: string;
              coordinates?: { lng: number; lat: number } | null;
              sources?: string[];
            }>(
              policy.model,
              dossierSystem(),
              `المكان: ${c.name_en}${c.name_ar ? ` (${c.name_ar})` : ""}\nالسياق: ${scopeNote}\nلماذا مميز: ${c.hint_ar}`,
              1800,
              true
            );

            const validMonths = (dossier.best_months ?? []).filter((m) => m >= 1 && m <= 12);
            const cat = CATEGORY_ENUM.includes(c.category) ? c.category : "other";

            const { error: insErr } = await supabase.from("atlas_scout_places").insert({
              run_id: runId,
              target_id: targetId,
              user_id: user.id,
              name_en: c.name_en,
              name_ar: c.name_ar || null,
              category: cat,
              vibe: VIBE_ENUM.includes(dossier.vibe ?? "") ? dossier.vibe : null,
              coordinates: dossier.coordinates ?? null,
              address_line: geo && kind === "city" ? `${c.name_en}, ${geo.nameEn}` : null,
              city: kind === "city" ? (body.displayNameAr ?? query) : null,
              description_ar: dossier.description_ar,
              atmosphere_ar: dossier.atmosphere_ar ?? null,
              tips_ar: dossier.tips_ar ?? null,
              best_months: validMonths,
              duration_minutes: Number.isFinite(dossier.duration_minutes) ? dossier.duration_minutes : null,
              price_level:
                typeof dossier.price_level === "number" &&
                Number.isFinite(dossier.price_level) &&
                dossier.price_level >= 0 &&
                dossier.price_level <= 4
                  ? Math.round(dossier.price_level)
                  : null,
              signature_dish: dossier.signature_dish || null,
              photo_query_en: dossier.photo_query_en || c.name_en,
              sources: (dossier.sources ?? []).slice(0, 5),
            });
            if (!insErr) filed++;
          } catch {
            // One bad dossier must not kill the run.
          }
        }

        // Finalize run
        await supabase
          .from("atlas_scout_runs")
          .update({
            status: filed > 0 ? "completed" : "failed",
            places_found: filed,
            completed_at: new Date().toISOString(),
            ...(filed === 0 ? { error_message: "لم يُدوَّن أي مكان" } : {}),
          })
          .eq("id", runId);

        sse(controller, "done", { filed, total: candidates.length });
        controller.close();
      } catch (e) {
        const msg = (e as Error).message ?? "خطأ غير متوقع";
        if (runId) {
          await supabase
            .from("atlas_scout_runs")
            .update({ status: "failed", error_message: msg.slice(0, 300), completed_at: new Date().toISOString() })
            .eq("id", runId);
        }
        sse(controller, "error", { message: msg });
        controller.close();
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
