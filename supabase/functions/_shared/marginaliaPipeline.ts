// Article ingestion pipeline shared by `mg-ingest` (daily/batch) and
// `mg-add-article` (synchronous, user-pasted URL).

import { fetchWithRetry, isSafeUrl, scrapeArticle, stripText, USER_AGENT } from "./rss-utils.ts";
import { callOpenRouter, chunkText, embedTexts, safeJson } from "./marginalia.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface IngestOutcome {
  url: string;
  status: "processed" | "skipped" | "error";
  articleId?: string;
  title?: string;
  reason?: string;
}

const SUMMARY_SYSTEM =
  `You analyse long-form essays. Return ONLY JSON:
{"summary":"3-5 sentence precis of the argument, in the article's own language",
 "summary_ar":"ملخص من ثلاث إلى خمس جمل بالعربية",
 "domain_tags":["lowercase_snake_case domain labels, 2-5 of them, e.g. philosophy, ecology, cognitive_science"]}
Tags describe intellectual domains, not topics of the week. No prose outside the JSON.`;

/**
 * Runs the full pipeline for one URL: scrape → summarise + tag → chunk →
 * embed → persist. Idempotent per (user, url): an existing processed
 * article short-circuits as "skipped".
 */
export async function ingestUrl(
  db: Db,
  userId: string,
  url: string,
  sourceId: string | null,
  meta: { title?: string; publishedAt?: string | null; author?: string } = {},
): Promise<IngestOutcome> {
  if (!isSafeUrl(url)) return { url, status: "error", reason: "unsafe_url" };

  const { data: existing } = await db
    .from("mg_articles")
    .select("id,status")
    .eq("user_id", userId)
    .eq("url", url)
    .maybeSingle();
  if (existing?.status === "processed") {
    return { url, status: "skipped", articleId: existing.id, reason: "already_ingested" };
  }

  const scraped = await scrapeArticle(url, 15000);
  let raw = scraped ? stripText(scraped.html) : "";
  // Readability-style container extraction fails on hand-written or
  // table-based pages (personal essay sites, old blogs). Falling back to
  // the whole document body still yields clean prose for those.
  if (raw.length < 600) {
    const fallback = await fetchPlainText(url);
    if (fallback.length > raw.length) raw = fallback;
  }
  if (raw.length < 600) {
    await upsertArticle(db, userId, url, sourceId, {
      title: meta.title ?? scraped?.title ?? url,
      author: meta.author ?? null,
      published_at: meta.publishedAt ?? null,
      raw_text: raw || null,
      word_count: raw ? raw.split(/\s+/).length : 0,
      status: "error",
      error_message: "extraction_too_short",
    });
    return { url, status: "error", reason: "extraction_too_short" };
  }

  // ── One LLM call for summary + domain tags ──────────────────────────
  let summary: string | null = null;
  let tags: string[] = [];
  try {
    const { text } = await callOpenRouter(
      [
        { role: "system", content: SUMMARY_SYSTEM },
        {
          role: "user",
          content: `TITLE: ${meta.title ?? scraped?.title ?? ""}\n\n${raw.slice(0, 14000)}`,
        },
      ],
      { json: true, temperature: 0.2, maxTokens: 900 },
    );
    const parsed = safeJson<{ summary?: string; summary_ar?: string; domain_tags?: string[] }>(text);
    const ar = parsed?.summary_ar?.trim();
    const en = parsed?.summary?.trim();
    summary = [ar, en].filter(Boolean).join("\n\n") || null;
    tags = (parsed?.domain_tags ?? [])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40))
      .filter(Boolean)
      .slice(0, 6);
  } catch (e) {
    // A summariser outage must not lose the article — store it and let a
    // later run enrich it.
    console.error(JSON.stringify({ event: "summary_failed", url, error: (e as Error).message }));
  }

  const articleId = await upsertArticle(db, userId, url, sourceId, {
    title: (meta.title ?? scraped?.title ?? url).slice(0, 500),
    author: meta.author ?? null,
    published_at: meta.publishedAt ?? null,
    raw_text: raw.slice(0, 120_000),
    summary,
    domain_tags: tags,
    word_count: raw.split(/\s+/).length,
    status: "queued",
    error_message: null,
  });
  if (!articleId) return { url, status: "error", reason: "persist_failed" };

  // ── Chunk + embed ──────────────────────────────────────────────────
  try {
    const chunks = chunkText(raw);
    if (chunks.length) {
      const { vectors, mode } = await embedTexts(chunks);
      if (mode === "lexical") {
        console.warn(JSON.stringify({ event: "lexical_embeddings_used", url }));
      }
      await db.from("mg_article_chunks").delete().eq("article_id", articleId);
      const rows = chunks.map((chunk_text, i) => ({
        user_id: userId,
        article_id: articleId,
        chunk_index: i,
        chunk_text,
        embedding: vectors[i],
      }));
      for (let i = 0; i < rows.length; i += 20) {
        const { error } = await db.from("mg_article_chunks").insert(rows.slice(i, i + 20));
        if (error) throw new Error(error.message);
      }
    }
    await db.from("mg_articles")
      .update({ status: "processed", error_message: null })
      .eq("id", articleId);
    return { url, status: "processed", articleId, title: meta.title ?? scraped?.title };
  } catch (e) {
    const reason = (e as Error).message.slice(0, 300);
    await db.from("mg_articles")
      .update({ status: "error", error_message: reason })
      .eq("id", articleId);
    return { url, status: "error", articleId, reason };
  }
}

/** Last-resort extraction: strip chrome from the full document. */
async function fetchPlainText(url: string): Promise<string> {
  try {
    const res = await fetchWithRetry(
      url,
      { headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" }, redirect: "follow" },
      15000,
      0,
    );
    if (!res.ok) return "";
    const html = await res.text();
    const body = html
      .replace(/<(script|style|noscript|svg|nav|header|footer|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|br|li|h[1-6]|tr)>/gi, "\n");
    return stripText(body);
  } catch { return ""; }
}

async function upsertArticle(
  db: Db,
  userId: string,
  url: string,
  sourceId: string | null,
  // deno-lint-ignore no-explicit-any
  fields: Record<string, any>,
): Promise<string | null> {
  const { data, error } = await db
    .from("mg_articles")
    .upsert(
      { user_id: userId, url, source_id: sourceId, fetched_at: new Date().toISOString(), ...fields },
      { onConflict: "user_id,url" },
    )
    .select("id")
    .maybeSingle();
  if (error) {
    console.error(JSON.stringify({ event: "upsert_article_failed", url, error: error.message }));
    return null;
  }
  return data?.id ?? null;
}
