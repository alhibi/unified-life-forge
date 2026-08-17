import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";
import { callOpenRouter, safeJson } from "../_shared/marginalia.ts";

interface GeneratedEntry {
  entry_type: "word" | "phrase" | "sentence" | "idiom";
  german_text: string;
  gender?: "der" | "die" | "das" | "plural" | "n_a";
  ipa?: string;
  arabic_translation: string;
  register?: "formal" | "neutral" | "informal" | "slang";
  is_separable_verb?: boolean;
  separable_prefix?: string;
  example_sentence_de?: string;
  example_sentence_ar?: string;
  difficulty_level?: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  const userId = auth.userId;
  if (!userId) return jsonResponse({ error: "user_required" }, 401);

  let body: {
    shelf_slug?: string;
    situation_brief?: string;
    count?: number;
    difficulty_level?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const shelfSlug = typeof body.shelf_slug === "string" ? body.shelf_slug.trim() : "";
  const situationBrief = typeof body.situation_brief === "string" ? body.situation_brief.trim() : "";
  const count = Math.min(Math.max(typeof body.count === "number" ? body.count : 5, 1), 20);
  const difficultyLevel = typeof body.difficulty_level === "string" ? body.difficulty_level.trim() : "A1";

  if (!shelfSlug) return jsonResponse({ error: "shelf_slug_required" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Look up shelf
  const { data: shelf, error: shelfErr } = await db
    .from("german_club_shelves")
    .select("id, title_ar, title_de")
    .eq("slug", shelfSlug)
    .maybeSingle();

  if (shelfErr || !shelf) {
    return jsonResponse({ error: "shelf_not_found" }, 404);
  }

  const promptMessages = [
    {
      role: "system" as const,
      content: `أنت خبير لغة ألمانية ومصمم محتوى تعليمي للمتحدثين بالعربية في "النادي الألماني".
مهمتك توليد مفردات وعبارات ألمانية واقعية وحقيقية 100% مرتبطة بموقف محدد.

قواعد صارمة جداً:
1. يمنع منعا باتا اختراع كلمات أو ترجمات خاطئة. إذا لم تكن متأكداً، لا تخمن.
2. لكل اسم (Noun)، يجب تحديد الجندر بدقة: "der", "die", "das", "plural", أو "n_a" للأفعال والعبارات.
3. للأفعال المنفصلة (is_separable_verb: true)، حدد البادئة المنفصلة (separable_prefix) بدقة، وضمان أن مظهر البادئة في جملة المثال ينفصل إلى آخر الجملة (مثل: "Ich stehe um sieben Uhr auf.").
4. اكتب الترجمة العربية بأسلوب أنيق، دقيق، وسهل الفهم على الهاتف المحمول.
5. حدد درجة الثقة (confidence) برقم من 0.0 إلى 1.0.
6. الإخراج يجب أن يكون JSON حصراً بتنسيق مفتاح "entries" يحتوي قائمة العناصر.

صيغة العنصر بالـ JSON:
{
  "entries": [
    {
      "entry_type": "word" | "phrase" | "sentence" | "idiom",
      "german_text": "string",
      "gender": "der" | "die" | "das" | "plural" | "n_a",
      "ipa": "string or null",
      "arabic_translation": "string",
      "register": "formal" | "neutral" | "informal" | "slang",
      "is_separable_verb": boolean,
      "separable_prefix": "string or null",
      "example_sentence_de": "string",
      "example_sentence_ar": "string",
      "difficulty_level": "${difficultyLevel}",
      "confidence": number
    }
  ]
}`,
    },
    {
      role: "user" as const,
      content: `أنشئ ${count} عناصر ألمانية حقيقية لرف المواقف: "${shelf.title_ar}" (${shelf.title_de ?? shelfSlug}).
سياق الموقف الإضافي: ${situationBrief || "مواقف يومية معتادة في هذا الرف"}.
مستوى الصعوبة: ${difficultyLevel}.`,
    },
  ];

  try {
    const aiResult = await callOpenRouter(promptMessages, {
      json: true,
      temperature: 0.3,
      maxTokens: 2500,
    });

    const parsed = safeJson<{ entries: GeneratedEntry[] }>(aiResult.text);
    if (!parsed || !Array.isArray(parsed.entries) || parsed.entries.length === 0) {
      return jsonResponse({ error: "Failed to parse generated JSON", raw: aiResult.text }, 500);
    }

    const rowsToInsert = parsed.entries.map((item, idx) => {
      const confidence = typeof item.confidence === "number" ? item.confidence : 0.8;
      if (confidence < 0.85) {
        console.warn(
          JSON.stringify({
            event: "german_club_low_confidence_entry",
            text: item.german_text,
            confidence,
            shelfSlug,
          })
        );
      }

      return {
        shelf_id: shelf.id,
        entry_type: item.entry_type || "word",
        german_text: item.german_text,
        gender: item.gender || "n_a",
        ipa: item.ipa || null,
        arabic_translation: item.arabic_translation,
        register: item.register || "neutral",
        is_separable_verb: Boolean(item.is_separable_verb),
        separable_prefix: item.separable_prefix || null,
        example_sentence_de: item.example_sentence_de || null,
        example_sentence_ar: item.example_sentence_ar || null,
        difficulty_level: item.difficulty_level || difficultyLevel,
        review_status: "ai_generated", // Always insert as draft
        sort_order: 100 + idx,
      };
    });

    const { data: inserted, error: insertErr } = await db
      .from("german_club_entries")
      .insert(rowsToInsert)
      .select("id, german_text, arabic_translation, review_status");

    if (insertErr) {
      return jsonResponse({ error: insertErr.message }, 500);
    }

    return jsonResponse({
      success: true,
      shelf_slug: shelfSlug,
      inserted_count: inserted.length,
      entries: inserted,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
