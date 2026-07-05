// Archive generator — sequential 3-stage pipeline via OpenRouter.
// Streams SSE progress events, saves final document to `archive_documents`.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Depth = "standard" | "deep" | "deepest";
type Stage = "outline" | "expansion" | "synthesis";

interface ModelConfig {
  [key: string]: string; // model: name
}

const AVAILABLE_MODELS: ModelConfig = {
  "gpt-4o": "openai/gpt-4o-2024-08-06",
  "gpt-4-turbo": "openai/gpt-4-turbo-2024-04-09",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet-20241022",
  "claude-3.5-haiku": "anthropic/claude-3.5-haiku-20241022",
};

interface PolicyConfig {
  sections: number;
  subs: number;
  words: number;
  complexity: string;
}

const DEFAULT_POLICY: Record<Depth, PolicyConfig> = {
  standard: { sections: 4, subs: 2, words: 350, complexity: "قياسي" },
  deep:     { sections: 5, subs: 3, words: 550, complexity: "متعمّق" },
  deepest:  { sections: 6, subs: 4, words: 750, complexity: "أقصى عمق" },
};

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");

interface RequestBody {
  topic: string;
  depth: Depth;
  models?: {
    outline?: string;   // نموذج تصميم الهيكل
    expansion?: string; // نموذج التوسيع والكتابة
    synthesis?: string; // نموذج التلخيص والوسوم
  };
}

async function callOpenRouter(model: string, system: string, user: string, maxTokens: number, json = false): Promise<string> {
  console.log(`[archive-generate] Calling ${model} with ${maxTokens} max tokens`);
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://amv.life",
      "X-Title": "SmartHub Archive",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error(`[archive-generate] OpenRouter error: ${r.status} - ${t.slice(0, 200)}`);
    throw new Error(`OpenRouter ${r.status}: ${t.slice(0, 400)}`);
  }
  const j = await r.json();
  const txt = j?.choices?.[0]?.message?.content;
  if (typeof txt !== "string") throw new Error("No text in OpenRouter response");
  return txt;
}

async function callJSON<T>(model: string, system: string, user: string, maxTokens: number): Promise<T> {
  const raw = await callOpenRouter(model, system, user, maxTokens, true);
  const clean = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    // try to extract first {...} block
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("Model returned non-JSON output");
  }
}

// ─── prompts (Arabic) ─────────────────────────────────────────────────────

function outlinePrompt(topic: string, depth: Depth, policy: PolicyConfig) {
  const system = `أنت رئيس تحرير أبحاث في أرشيف معرفي راقٍ. مهمتك تصميم هيكل بحث طويل ومعمّق قبل أن تُكتب كلمة واحدة.

لأي موضوع، استعِن بأي من هذه الأبعاد المناسبة (لا تُقحم بُعداً لا يخدم الموضوع):
- الأصول التاريخية والسياق
- التحليل التقني/البنيوي/المادي
- الدوافع الإنسانية والنفسية
- الإرث الجمالي والثقافي والرمزي
- التفكيك النقدي والأساطير والحدود

الشكل المطلوب: بالضبط ${policy.sections} أقسام رئيسية، لكل قسم بالضبط ${policy.subs} أقسام فرعية.
كل قسم فرعي يجب أن يحمل "زاوية" (angle) — جملة واحدة تحدد الادّعاء أو النمط الحقائقي الذي يخصّه وحده.

أعِد فقط JSON خام (بدون سياج markdown) بهذا الشكل:
{"title":"...","synopsis":"جملتان أو ثلاث","sections":[{"id":"kebab-case","title":"...","dimension":"...","subsections":[{"id":"kebab-case","title":"...","angle":"..."}]}]}`;
  const user = `الموضوع: "${topic}"\nمستوى العمق: ${depth}`;
  return { system, user };
}

function expansionPrompt(outline: any, section: any, sub: any, prev: string, idx: number, total: number) {
  const map = outline.sections.map((s: any) => `${s.title}: ${s.subsections.map((x: any) => x.title).join("، ")}`).join("\n");
  const system = `أنت تكتب القسم الفرعي رقم ${idx} من ${total} في بحث طويل بعنوان "${outline.title}". اكتب بسلطة كاتب مقالات طويلة.

خريطة كامل البحث — للسياق فقط. لا تُكرّر هذه، ولا تنجرف إلى غير قسمك:
${map}

الاستمرارية — آخر ما كُتب. اجعل جملتك الأولى امتداراً طبيعياً لها دون الإشارة إليها أو الإعلان عن انتقال:
"${prev}"

قواعد صارمة:
- أخرِج المتن فقط. لا عنوان، لا "بالطبع، إليك…"، لا خاتمة تلخّص، لا تشويق لما بعد.
- اكتب حوالي ${sub.targetWords ?? 500} كلمة (± 15%).
- التزم بالزاوية المحدّدة: ${sub.angle}
- بالعربية الفصحى، بأسلوب أدبي معرفي رصين.`;
  const user = `القسم: ${section.title}\nالقسم الفرعي: ${sub.title}\nالزاوية: ${sub.angle}`;
  return { system, user };
}

function metaPrompt(outline: any, excerpt: string) {
  const system = `تعمل كأمين أرشيف. من العنوان والمقتطف التالي، استخرج:
- 5 إلى 8 وسوم (tags) قصيرة بالعربية
- ملخص من جملتين
أعِد JSON فقط: {"tags":["..."],"abstract":"..."}`;
  const user = `العنوان: ${outline.title}\nمقتطف:\n${excerpt}`;
  return { system, user };
}

// ─── helpers ──────────────────────────────────────────────────────────────
function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
function lastSentences(s: string, n: number): string {
  const parts = s.trim().split(/(?<=[.!؟?])\s+/);
  return parts.slice(-n).join(" ").slice(-500);
}
function compile(outline: any, generated: any[]): string {
  const by = new Map<string, any[]>();
  for (const g of generated) {
    const arr = by.get(g.sectionId) ?? [];
    arr.push(g); by.set(g.sectionId, arr);
  }
  const body = outline.sections.map((sec: any) => {
    const subs = (by.get(sec.id) ?? []).map((g) => `### ${g.title}\n\n${g.markdown.trim()}`).join("\n\n");
    return `## ${sec.title}\n\n${subs}`;
  }).join("\n\n");
  return `# ${outline.title}\n\n${body}`;
}

// ─── main ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!OPENROUTER_KEY) return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: RequestBody;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
  
  const topic = (body.topic || "").trim();
  const depth: Depth = (["standard", "deep", "deepest"].includes(body.depth) ? body.depth : "standard") as Depth;
  
  if (!topic || topic.length < 3 || topic.length > 500) {
    return new Response(JSON.stringify({ error: "topic must be 3-500 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // تحديد النماذج - استخدم المخصص أو الافتراضي
  const modelNames = {
    outline: body.models?.outline || "gpt-4o-mini",
    expansion: body.models?.expansion || "gpt-4-turbo",
    synthesis: body.models?.synthesis || "gpt-4o",
  };

  // تحويل أسماء النماذج إلى full model IDs من OpenRouter
  const models = {
    outline: AVAILABLE_MODELS[modelNames.outline] || modelNames.outline,
    expansion: AVAILABLE_MODELS[modelNames.expansion] || modelNames.expansion,
    synthesis: AVAILABLE_MODELS[modelNames.synthesis] || modelNames.synthesis,
  };

  const policy = DEFAULT_POLICY[depth];

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // Stage 1: Outline
        send({ stage: "outline", message: "تصميم الهيكل والتصنيف…", model: modelNames.outline });
        const op = outlinePrompt(topic, depth, policy);
        const outlineRaw = await callJSON<any>(models.outline, op.system, op.user, 3000);
        if (!outlineRaw?.sections?.length) throw new Error("outline invalid");
        const outline = {
          title: outlineRaw.title,
          synopsis: outlineRaw.synopsis || "",
          sections: outlineRaw.sections.map((s: any) => ({
            id: s.id, title: s.title, dimension: s.dimension,
            subsections: s.subsections.map((sub: any) => ({ ...sub, targetWords: policy.words })),
          })),
        };
        send({ stage: "outline_done", outline });

        // Stage 2: Sequential expansion
        const totalSubs = outline.sections.reduce((n: number, s: any) => n + s.subsections.length, 0);
        const generated: any[] = [];
        let prev = outline.synopsis || outline.title;
        let done = 0;
        for (const section of outline.sections) {
          for (const sub of section.subsections) {
            done++;
            send({ stage: "expansion", message: `توسيع: ${section.title} ← ${sub.title}`, current: done, total: totalSubs, model: modelNames.expansion });
            const ep = expansionPrompt(outline, section, sub, prev, done, totalSubs);
            const maxTok = Math.min(4096, Math.max(600, Math.round(policy.words * 1.8)));
            const md = await callOpenRouter(models.expansion, ep.system, ep.user, maxTok);
            generated.push({ sectionId: section.id, subsectionId: sub.id, title: sub.title, markdown: md, wordCount: countWords(md) });
            prev = lastSentences(md, 2);
          }
        }

        // Stage 3: Synthesis + metadata
        send({ stage: "synthesis", message: "تجميع الأقسام واستخراج الوسوم…", model: modelNames.synthesis });
        const content = compile(outline, generated);
        const mp = metaPrompt(outline, content.slice(0, 1200));
        let meta: { tags: string[]; abstract: string } = { tags: [], abstract: "" };
        try {
          meta = await callJSON<{ tags: string[]; abstract: string }>(models.synthesis, mp.system, mp.user, 400);
        } catch (e) {
          console.error("metadata failed", e);
        }

        // Save
        const { data: saved, error: saveErr } = await supabase
          .from("archive_documents")
          .insert({
            user_id: user.id,
            title: outline.title,
            topic,
            depth,
            complexity: policy.complexity,
            tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 10) : [],
            abstract: meta.abstract || "",
            content,
            outline,
            word_count: countWords(content),
            models_used: models, // حفظ النماذج المستخدمة
          })
          .select("id, accession_number, title, word_count")
          .single();
        if (saveErr) throw saveErr;

        send({ stage: "filed", document: saved });
        controller.close();
      } catch (err: any) {
        console.error("archive-generate error", err);
        send({ stage: "error", message: err?.message || "generation failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});
