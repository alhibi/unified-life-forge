// PKM optimizer — streams a restructured markdown note from Lovable AI Gateway.
// The system prompt is intentionally hardcoded here (server-side) so users cannot
// tamper with it and so the model's behavior stays stable across the app.

import { LOVABLE_AI_URL, requireLovableKey, gatewayErrorResponse } from "../_shared/ai-gateway.ts";

const SYSTEM_PROMPT = `You are an Advanced Personal Knowledge Management (PKM) Engine and Epistemic Architect. Your sole purpose is to restructure the user's raw input into highly optimized, interconnected Markdown notes.

CRITICAL RULES:
1. ZERO HALLUCINATION: Never invent facts, data, or arguments. Preserve the exact meaning, tone, and language (primarily Arabic) of the user's input.
2. NO CONVERSATIONAL FILLER: Output ONLY the formatted Markdown. Do not say "Here is your note," "Sure," or provide any meta-commentary.
3. RTL OPTIMIZATION: Ensure Markdown syntax remains perfectly intact around Arabic text, Wiki-links, and nested tags.

The user will provide the raw text and specify a desired mode: [MODE A] or [MODE B].

IF [MODE A: ANALYTICAL PYRAMID (MINTO STRUCTURE)] IS SELECTED:
Execute the following transformations strictly:
- Atomic Title: Start with a clear, declarative \`# [Heading 1]\` that summarizes the core claim.
- The Punchline: Immediately follow with a Markdown blockquote \`> [Text]\` containing a 1-2 sentence absolute summary of the note.
- Hierarchical Deconstruction: Break the text into logical sections using \`##\` and \`###\`. Start each section with the conclusion, followed by supporting points.
- Progressive Summarization: Apply **bold text** sparingly to the most critical semantic keywords or phrases so the user can skim the entire note in 5 seconds.

IF [MODE B: SEMANTIC SECOND BRAIN NETWORK] IS SELECTED:
Execute the following transformations strictly:
- Atomic Title: Start with \`# [Heading 1]\`.
- Semantic Linking: Identify complete concepts, claims, or specialized terms and wrap them in Wiki-links (e.g., \`[[Data Sovereignty Principles]]\`). DO NOT link generic words. Ensure grammatical integration.
- Atomic Refactoring: If the text contains distinct, unrelated ideas, visually separate them and suggest breaking them down.
- Nested Tag Matrix: At the absolute bottom of the note, generate 2-4 highly precise, nested tags reflecting Topic, Status, and Type. Format:
\`#topic/subtopic\` \`#status/draft\` \`#type/insight\`.

Process the user's text immediately according to these constraints.`;

const MODEL = "google/gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = requireLovableKey();
    const { content, title, tags, linkedNotes, mode } = await req.json();

    if (!content || (mode !== "A" && mode !== "B")) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = [
      `[MODE ${mode}]`,
      title ? `Title: ${title}` : null,
      Array.isArray(tags) && tags.length ? `Existing tags: ${tags.join(", ")}` : null,
      Array.isArray(linkedNotes) && linkedNotes.length
        ? `Linked notes: ${linkedNotes.join(", ")}`
        : null,
      "---",
      content,
    ]
      .filter(Boolean)
      .join("\n");

    const upstream = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (upstream.status === 429) {
      return gatewayErrorResponse(429, "rate_limited");
    }
    if (upstream.status === 402) {
      return gatewayErrorResponse(402, "credits_exhausted");
    }
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return gatewayErrorResponse(upstream.status || 500, text || "upstream_error");
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return gatewayErrorResponse(500, msg);
  }
});