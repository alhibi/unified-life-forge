import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse, requireUser } from "../_shared/rss-utils.ts";
import { CHAT_MODELS, type ChatMessage, embedTexts, streamOpenRouter } from "../_shared/marginalia.ts";

/**
 * mg-chat — RAG over the personal archive. Streams the answer as SSE so a
 * long reply never hits a request timeout, then persists the assistant
 * message (with citations) once the stream closes.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
  const userId = auth.userId;
  if (!userId) return jsonResponse({ error: "user_required" }, 401);

  let body: { conversationId?: unknown; message?: unknown; models?: unknown };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
  const question = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  if (!question || question.length > 4000) return jsonResponse({ error: "invalid_message" }, 400);
  if (!conversationId) return jsonResponse({ error: "conversation_required" }, 400);
  const models = Array.isArray(body.models)
    ? (body.models as unknown[]).filter((m): m is string => typeof m === "string" && m.length < 80)
    : [];

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Ownership check — the service-role client bypasses RLS, so verify here.
  const { data: convo } = await db.from("mg_conversations")
    .select("id,user_id,title").eq("id", conversationId).maybeSingle();
  if (!convo || convo.user_id !== userId) return jsonResponse({ error: "not_found" }, 404);

  // ── Retrieval ───────────────────────────────────────────────────────
  let contextBlock = "";
  let citedIds: string[] = [];
  try {
    const [embedding] = await embedTexts([question]);
    const { data: matches } = await db.rpc("mg_match_chunks", {
      query_embedding: embedding,
      match_count: 8,
      p_user_id: userId,
    });
    const rows = (matches ?? []) as Match[];
    citedIds = [...new Set(rows.map((r) => r.article_id))];
    contextBlock = rows.map((r, i) =>
      `[${i + 1}] ${r.article_title ?? "(untitled)"} — ${r.article_url}\n${r.chunk_text.slice(0, 1600)}`
    ).join("\n\n---\n\n");
  } catch (e) {
    console.error(JSON.stringify({ event: "retrieval_failed", error: (e as Error).message }));
  }

  // ── Prior turns (short window, oldest first) ────────────────────────
  const { data: history } = await db.from("mg_messages")
    .select("role,content").eq("conversation_id", conversationId)
    .order("created_at", { ascending: false }).limit(10);
  const priors = ((history ?? []) as { role: string; content: string }[])
    .reverse()
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.content.slice(0, 4000),
    }));

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `أنت رفيق قراءة يعمل حصراً على أرشيف المستخدم الشخصي.
- استند إلى المقتطفات المرفقة فقط، وأشر إلى المصدر بالشكل [1]، [2].
- إذا لم تكفِ المقتطفات، قل ذلك صراحةً ولا تخترع.
- اجعل الجواب بالعربية، مركّزاً وبلا حشو.

المقتطفات:
${contextBlock || "(لا توجد مقتطفات مطابقة في الأرشيف)"}`,
    },
    ...priors,
    { role: "user", content: question },
  ];

  await db.from("mg_messages").insert({
    user_id: userId, conversation_id: conversationId, role: "user", content: question,
  });
  if (!convo.title) {
    await db.from("mg_conversations")
      .update({ title: question.slice(0, 80) }).eq("id", conversationId);
  }

  let stream: Awaited<ReturnType<typeof streamOpenRouter>>;
  try {
    stream = await streamOpenRouter(messages, models.length ? models : CHAT_MODELS);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 502);
  }

  const model = stream.model;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let full = "";

  const out = new ReadableStream({
    async start(controller) {
      const reader = stream.res.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                full += delta;
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ delta })}\n\n`,
                ));
              }
            } catch { /* keep-alive or partial frame */ }
          }
        }
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ done: true, model, citedArticleIds: citedIds })}\n\n`,
        ));
      } catch (e) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ error: (e as Error).message })}\n\n`,
        ));
      } finally {
        if (full.trim()) {
          await db.from("mg_messages").insert({
            user_id: userId,
            conversation_id: conversationId,
            role: "assistant",
            content: full.slice(0, 20000),
            model_used: model,
            cited_article_ids: citedIds,
          });
          await db.from("mg_conversations")
            .update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
        }
        controller.close();
      }
    },
  });

  return new Response(out, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});

interface Match {
  chunk_id: string;
  article_id: string;
  chunk_text: string;
  similarity: number;
  article_title: string | null;
  article_url: string;
}
