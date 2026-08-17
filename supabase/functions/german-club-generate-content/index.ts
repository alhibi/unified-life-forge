import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";
import { callOpenRouter, safeJson } from "../_shared/marginalia.ts";

// Supabase EdgeRuntime declaration for background task execution
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

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
    job_id?: string;
    shelf_id?: string;
    shelf_slug?: string;
    model_id?: string;
    mode?: "model_capacity" | "fixed_count";
    target_count?: number;
    content_type?: "entry" | "grammar_note";
    situation_brief?: string;
    count?: number;
    difficulty_level?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const jobId = typeof body.job_id === "string" ? body.job_id.trim() : null;
  const modelId = typeof body.model_id === "string" && body.model_id.trim()
    ? body.model_id.trim()
    : "google/gemini-2.5-flash";
  const mode = body.mode === "fixed_count" ? "fixed_count" : "model_capacity";
  // Enforce max ceiling of 500 for fixed_count
  const rawTarget = typeof body.target_count === "number" ? body.target_count : (typeof body.count === "number" ? body.count : 10);
  const targetCount = Math.min(Math.max(rawTarget, 1), 500);

  const contentType = body.content_type === "grammar_note" ? "grammar_note" : "entry";
  const shelfSlug = typeof body.shelf_slug === "string" ? body.shelf_slug.trim() : "";
  const shelfIdInput = typeof body.shelf_id === "string" ? body.shelf_id.trim() : "";
  const situationBrief = typeof body.situation_brief === "string" ? body.situation_brief.trim() : "";
  const difficultyLevel = typeof body.difficulty_level === "string" ? body.difficulty_level.trim() : "A1";

  // Lookup shelf by ID or Slug
  let shelf: { id: string; title_ar: string; title_de: string | null; slug: string } | null = null;
  if (shelfIdInput || shelfSlug) {
    let query = db.from("german_club_shelves").select("id, title_ar, title_de, slug");
    if (shelfIdInput) query = query.eq("id", shelfIdInput);
    else query = query.eq("slug", shelfSlug);

    const { data: shelfData } = await query.maybeSingle();
    if (shelfData) shelf = shelfData;
  }

  if (contentType === "entry" && !shelf) {
    return jsonResponse({ error: "shelf_not_found" }, 404);
  }

  // If a jobId is provided, kick off asynchronous background processing using waitUntil
  if (jobId) {
    // 1. Immediately mark job as running
    await db
      .from("content_generation_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // 2. Schedule the background task
    const bgTask = processGenerationJob({
      db,
      jobId,
      shelf: shelf!,
      modelId,
      mode,
      targetCount,
      difficultyLevel,
      situationBrief,
    });

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(bgTask);
    } else {
      // Fallback: run async without awaiting
      bgTask.catch((err) => console.error("Background job unhandled error:", err));
    }

    return jsonResponse({
      success: true,
      job_id: jobId,
      status: "running",
      message: "Generation job started in background",
    });
  }

  // Legacy synchronous path (when no job_id is supplied)
  try {
    const result = await generateBatch({
      db,
      shelf,
      modelId,
      contentType,
      difficultyLevel,
      situationBrief,
      batchCount: Math.min(targetCount, 20),
      existingGermanTexts: new Set<string>(),
    });

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

/**
 * Background Processor for Content Generation Jobs
 */
async function processGenerationJob(opts: {
  db: any;
  jobId: string;
  shelf: { id: string; title_ar: string; title_de: string | null; slug: string };
  modelId: string;
  mode: "model_capacity" | "fixed_count";
  targetCount: number;
  difficultyLevel: string;
  situationBrief: string;
}) {
  const { db, jobId, shelf, modelId, mode, targetCount, difficultyLevel, situationBrief } = opts;

  let totalGenerated = 0;
  let totalSkippedDuplicate = 0;
  let totalDiscardedLowQuality = 0;

  try {
    // Inventory Step 1: Fetch existing German entries for anti-duplication
    const { data: existingEntries } = await db
      .from("german_club_entries")
      .select("german_text")
      .eq("shelf_id", shelf.id);

    const existingGermanTexts = new Set<string>();
    if (existingEntries) {
      existingEntries.forEach((e: { german_text: string }) => {
        if (e.german_text) existingGermanTexts.add(e.german_text.trim().toLowerCase());
      });
    }

    let iterations = 0;
    const maxIterations = mode === "fixed_count" ? Math.ceil(targetCount / 10) + 3 : 10;
    let consecutiveZeroNewEntries = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Determine batch size for this step
      let batchSize = 12;
      if (mode === "fixed_count") {
        const remaining = targetCount - totalGenerated;
        if (remaining <= 0) break;
        batchSize = Math.min(remaining + 3, 15);
      }

      const batchResult = await generateBatch({
        db,
        shelf,
        modelId,
        contentType: "entry",
        difficultyLevel,
        situationBrief,
        batchCount: batchSize,
        existingGermanTexts,
      });

      totalGenerated += batchResult.accepted;
      totalSkippedDuplicate += batchResult.duplicates;
      totalDiscardedLowQuality += batchResult.lowQuality;

      // Update counters in database row after each batch for live UI progress
      await db
        .from("content_generation_jobs")
        .update({
          entries_generated: totalGenerated,
          entries_skipped_duplicate: totalSkippedDuplicate,
          entries_discarded_low_quality: totalDiscardedLowQuality,
        })
        .eq("id", jobId);

      if (batchResult.accepted === 0) {
        consecutiveZeroNewEntries++;
      } else {
        consecutiveZeroNewEntries = 0;
      }

      // Stop condition for model_capacity mode: if model produces 2 consecutive batches with 0 new/authentic entries
      if (mode === "model_capacity" && consecutiveZeroNewEntries >= 2) {
        console.log(`Model capacity reached for shelf ${shelf.slug} after ${iterations} iterations.`);
        break;
      }

      if (mode === "fixed_count" && totalGenerated >= targetCount) {
        break;
      }
    }

    // Mark job completed
    await db
      .from("content_generation_jobs")
      .update({
        status: "completed",
        entries_generated: totalGenerated,
        entries_skipped_duplicate: totalSkippedDuplicate,
        entries_discarded_low_quality: totalDiscardedLowQuality,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (err: any) {
    console.error(`Generation job ${jobId} failed:`, err);
    await db
      .from("content_generation_jobs")
      .update({
        status: "failed",
        error_message: err?.message || "Unknown generation error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

/**
 * Executes a single batch generation call against OpenRouter
 */
async function generateBatch(opts: {
  db: any;
  shelf: { id: string; title_ar: string; title_de: string | null; slug: string } | null;
  modelId: string;
  contentType: "entry" | "grammar_note";
  difficultyLevel: string;
  situationBrief: string;
  batchCount: number;
  existingGermanTexts: Set<string>;
}): Promise<{
  success: boolean;
  accepted: number;
  duplicates: number;
  lowQuality: number;
  entries?: any[];
  notes?: any[];
}> {
  const { db, shelf, modelId, contentType, difficultyLevel, situationBrief, batchCount, existingGermanTexts } = opts;

  const systemPrompt = contentType === "grammar_note"
    ? `You are generating etymology, cultural trivia, and grammar notes for "النادي الألماني," a premium German-learning section inside an Arabic-first app. Your output is reviewed by a human before it ever reaches a real user — your job is accuracy and authenticity.

Output MUST be strict JSON with a "notes" key containing an array of objects matching this exact shape:
{
  "notes": [
    {
      "title_ar": "string",
      "title_de": "string or null",
      "body_md": "string in Markdown detailing etymology, linguistic trivia, or grammar explanations",
      "difficulty_level": "${difficultyLevel}",
      "confidence": number
    }
  ]
}`
    : `You are generating vocabulary content for "النادي الألماني," a premium German-learning section inside an Arabic-first app. Your output is reviewed by a human before it ever reaches a real user — your job is accuracy and authenticity, not speed.

Editorial Guardrails (strict enforcement):
1. Accuracy over volume: Only include German you are confident is genuinely used by native speakers in this situation — do not pad with textbook-stiff phrases nobody actually says. If not confident, set confidence low (< 0.75).
2. Zero hallucinated gender: Get grammatical gender right every single time ("der", "die", "das", "plural", or "n_a"). If uncertain, set confidence below 0.75.
3. Register tagging is mandatory: Tag register honestly as "formal", "neutral", "informal", or "slang".
4. Swearing/profanity policy: Tag severity honestly as mild/medium/strong. Do not soften real usage, but do not generate slurs targeting race, religion, sexuality, or disability under any framing.
5. Mixed entry types: Mix entry types — include a realistic balance of "word", "phrase", "sentence", and "idiom".
6. Separable verbs: For separable verbs (is_separable_verb: true), specify separable_prefix and ensure the example sentence demonstrates proper V2/end-of-clause separation (e.g., "Ich stehe um sieben Uhr auf.").
7. Real-life example sentences: Every example sentence must be a sentence a real native speaker would say, translated into natural, polished Arabic.

Output MUST be strict JSON with an "entries" key containing an array of objects matching this exact shape:
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
}`;

  const promptMessages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: contentType === "grammar_note"
        ? `Generate ${batchCount} etymology/trivia/grammar notes at difficulty level ${difficultyLevel}. Context: ${situationBrief || "German etymology and grammar"}.`
        : `Generate ${batchCount} entries at difficulty level ${difficultyLevel} for shelf: "${shelf?.title_ar}" (${shelf?.title_de ?? shelf?.slug}).
Situation Context Brief: ${situationBrief || "Realistic daily-life German situations for this shelf"}.
Important: Do NOT include any of these existing entries: [${Array.from(existingGermanTexts).slice(-30).join(", ")}]`,
    },
  ];

  const aiResult = await callOpenRouter(promptMessages, {
    models: [modelId, "google/gemini-2.5-flash", "openai/gpt-4.1-mini"],
    json: true,
    temperature: 0.4,
    maxTokens: 3000,
  });

  if (contentType === "grammar_note") {
    const parsed = safeJson<{ notes: any[] }>(aiResult.text);
    if (!parsed || !Array.isArray(parsed.notes)) {
      throw new Error("Failed to parse generated notes JSON");
    }

    const rowsToInsert = parsed.notes
      .filter((n) => (n.confidence ?? 0.8) >= 0.7)
      .map((item, idx) => ({
        title_ar: item.title_ar,
        title_de: item.title_de || null,
        body_md: item.body_md,
        related_shelf_ids: shelf ? [shelf.id] : [],
        difficulty_level: item.difficulty_level || difficultyLevel,
        review_status: "ai_generated",
        sort_order: 100 + idx,
      }));

    if (rowsToInsert.length > 0) {
      await db.from("german_club_grammar_notes").insert(rowsToInsert);
    }

    return {
      success: true,
      accepted: rowsToInsert.length,
      duplicates: 0,
      lowQuality: parsed.notes.length - rowsToInsert.length,
      notes: rowsToInsert,
    };
  } else {
    const parsed = safeJson<{ entries: GeneratedEntry[] }>(aiResult.text);
    if (!parsed || !Array.isArray(parsed.entries)) {
      throw new Error("Failed to parse generated entries JSON");
    }

    let acceptedCount = 0;
    let duplicateCount = 0;
    let lowQualityCount = 0;
    const rowsToInsert: any[] = [];

    for (const item of parsed.entries) {
      const confidence = typeof item.confidence === "number" ? item.confidence : 0.8;
      const normalizedText = (item.german_text || "").trim().toLowerCase();

      // Quality Self-Audit check: discard low confidence
      if (confidence < 0.75 || !item.german_text || !item.arabic_translation) {
        lowQualityCount++;
        continue;
      }

      // Anti-Duplication check
      if (existingGermanTexts.has(normalizedText)) {
        duplicateCount++;
        continue;
      }

      existingGermanTexts.add(normalizedText);
      acceptedCount++;

      rowsToInsert.push({
        shelf_id: shelf!.id,
        entry_type: item.entry_type || "word",
        german_text: item.german_text.trim(),
        gender: item.gender || "n_a",
        ipa: item.ipa || null,
        arabic_translation: item.arabic_translation.trim(),
        register: item.register || "neutral",
        is_separable_verb: Boolean(item.is_separable_verb),
        separable_prefix: item.separable_prefix || null,
        example_sentence_de: item.example_sentence_de || null,
        example_sentence_ar: item.example_sentence_ar || null,
        difficulty_level: item.difficulty_level || difficultyLevel,
        review_status: "ai_generated", // Enforce draft status requiring human review
        sort_order: 100 + rowsToInsert.length,
      });
    }

    if (rowsToInsert.length > 0) {
      const { error: insertErr } = await db.from("german_club_entries").insert(rowsToInsert);
      if (insertErr) throw new Error(insertErr.message);
    }

    return {
      success: true,
      accepted: acceptedCount,
      duplicates: duplicateCount,
      lowQuality: lowQualityCount,
      entries: rowsToInsert,
    };
  }
}
