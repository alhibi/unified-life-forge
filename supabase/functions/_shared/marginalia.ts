// Shared server-side helpers for the Marginalia ("الهوامش") feature.
// Server-only: never import from client code — it reads OPENROUTER_API_KEY.

import { decodeEntities, fetchWithRetry, stripText, USER_AGENT } from "./rss-utils.ts";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Circuit-breaker fallback chain for reasoning/analysis calls. */
export const ANALYSIS_MODELS = [
  "google/gemini-2.5-flash",
  "openai/gpt-4.1-mini",
  "anthropic/claude-3.5-haiku",
];

/** Default chat model chain used when the client sends no preference. */
export const CHAT_MODELS = [
  "google/gemini-2.5-flash",
  "openai/gpt-4.1-mini",
  "meta-llama/llama-3.3-70b-instruct",
];

export const EMBEDDING_DIM = 1536;

export function requireOpenRouterKey(): string {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("missing_openrouter_key");
  return key;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResult {
  text: string;
  model: string;
}

/**
 * Calls OpenRouter with an explicit fallback chain. Any timeout, 5xx, 429
 * or malformed payload trips the breaker and moves to the next model; the
 * last error is rethrown when every candidate fails.
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  opts: {
    models?: string[];
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
    timeoutMs?: number;
  } = {},
): Promise<OpenRouterResult> {
  const key = requireOpenRouterKey();
  const models = (opts.models?.length ? opts.models : ANALYSIS_MODELS).slice(0, 4);
  let lastError = "no_models";

  for (const model of models) {
    try {
      const res = await fetchWithRetry(
        OPENROUTER_URL,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://amv.life",
            "X-Title": "Marginalia",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.maxTokens ?? 1600,
            ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          }),
        },
        opts.timeoutMs ?? 90_000,
        0,
      );
      if (!res.ok) {
        lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 240)}`;
        if (res.status === 400 || res.status === 401 || res.status === 402) {
          // Terminal for this key/request shape — no point walking the chain
          // for auth/credit errors.
          if (res.status !== 400) throw new Error(lastError);
        }
        continue;
      }
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) { lastError = `${model}: empty completion`; continue; }
      return { text, model };
    } catch (e) {
      lastError = `${model}: ${(e as Error).message}`;
    }
  }
  throw new Error(`openrouter_failed — ${lastError}`);
}

/** Streaming variant — returns the raw SSE response for passthrough. */
export async function streamOpenRouter(
  messages: ChatMessage[],
  models: string[],
): Promise<{ res: Response; model: string }> {
  const key = requireOpenRouterKey();
  let lastError = "no_models";
  for (const model of models.slice(0, 4)) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://amv.life",
          "X-Title": "Marginalia",
        },
        body: JSON.stringify({ model, messages, stream: true, temperature: 0.6 }),
      });
      if (!res.ok || !res.body) {
        lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 240)}`;
        continue;
      }
      return { res, model };
    } catch (e) {
      lastError = `${model}: ${(e as Error).message}`;
    }
  }
  throw new Error(`openrouter_stream_failed — ${lastError}`);
}

/**
 * Embeddings. OpenRouter exposes no embeddings endpoint, so vectors come
 * from the platform AI gateway's OpenAI-compatible embeddings route —
 * 1536 dims, matching `mg_article_chunks.embedding`.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("missing_embeddings_key");
  const out: number[][] = [];
  const BATCH = 16;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH).map((t) => t.slice(0, 8000));
    const res = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/embeddings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "openai/text-embedding-3-small",
          input: slice,
          dimensions: EMBEDDING_DIM,
        }),
      },
      60_000,
      1,
    );
    if (!res.ok) {
      throw new Error(`embeddings_failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const data = await res.json();
    for (const row of data?.data ?? []) out.push(row.embedding as number[]);
  }
  if (out.length !== texts.length) throw new Error("embeddings_count_mismatch");
  return out;
}

/** Rough token-aware chunker (~500 tokens ≈ 2000 chars) on paragraph edges. */
export function chunkText(text: string, targetChars = 2000, overlap = 200): string[] {
  const clean = text.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!clean) return [];
  const paras = clean.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf.length + p.length + 1 > targetChars && buf) {
      chunks.push(buf);
      buf = buf.slice(-overlap) + "\n" + p;
    } else {
      buf = buf ? `${buf}\n${p}` : p;
    }
    while (buf.length > targetChars * 1.6) {
      chunks.push(buf.slice(0, targetChars));
      buf = buf.slice(targetChars - overlap);
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.slice(0, 60);
}

export function safeJson<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.search(/[[{]/);
  if (start < 0) return null;
  const candidate = body.slice(start);
  try { return JSON.parse(candidate) as T; } catch { /* try trimming */ }
  for (let end = candidate.length; end > 20; end -= 1) {
    const ch = candidate[end - 1];
    if (ch !== "}" && ch !== "]") continue;
    try { return JSON.parse(candidate.slice(0, end)) as T; } catch { /* keep shrinking */ }
  }
  return null;
}

// ── Feed parsing (RSS + Atom) ───────────────────────────────────────────
export interface FeedItem { url: string; title: string; publishedAt: string | null; author?: string }

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return null;
  return decodeEntities(
    m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

export function parseFeed(xml: string, limit = 20): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) ?? [];
  for (const block of blocks) {
    let url = tag(block, "link") || "";
    if (!url || !/^https?:/i.test(url)) {
      const href = block.match(/<link[^>]*rel=["']?alternate["']?[^>]*href=["']([^"']+)["']/i) ||
        block.match(/<link[^>]*href=["']([^"']+)["']/i);
      url = href?.[1] ?? "";
    }
    if (!/^https?:/i.test(url)) continue;
    const title = tag(block, "title") || url;
    const dateRaw = tag(block, "pubDate") || tag(block, "published") ||
      tag(block, "updated") || tag(block, "dc:date");
    const parsed = dateRaw ? new Date(dateRaw) : null;
    items.push({
      url: url.trim(),
      title,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      author: tag(block, "dc:creator") || tag(block, "author") || undefined,
    });
    if (items.length >= limit) break;
  }
  return items;
}

export async function fetchFeed(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const res = await fetchWithRetry(
      url,
      { headers: { "User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml, */*" } },
      timeoutMs,
      1,
    );
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

export { stripText };
