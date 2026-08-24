// Article ingestion pipeline shared by `mg-ingest` (daily/batch) and
// `mg-add-article` (synchronous, user-pasted URL).

import { callOpenRouter, chunkText, embedTexts, safeJson } from "./marginalia.ts";
import { fetchWithRetry, isSafeUrl, scrapeArticle, stripText, USER_AGENT } from "./rss-utils.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface IngestOutcome {
  url: string;
  status: "processed" | "skipped" | "error";
  articleId?: string;
  title?: string;
  reason?: string;
}

/** Text signatures of bot-challenge interstitials served instead of prose. */
const CHALLENGE_RE =
  /(security checkpoint|just a moment|enable javascript and cookies|verifying you are human|attention required)/i;

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
  meta: { title?: string; publishedAt?: string | null; author?: string; fallbackText?: string } = {},
): Promise<IngestOutcome> {
  if (!isSafeUrl(url)) return { url, status: "error", reason: "unsafe_url" };

  const { data: existing } = await db
    .from("mg_articles")
    .select("id,status,error_message")
    .eq("user_id", userId)
    .eq("url", url)
    .maybeSingle();
  // Excerpt-only rows are re-attempted: a full-text copy may now be
  // reachable (fresh archive snapshot, site unblocked).
  if (existing?.status === "processed" && existing.error_message !== "feed_excerpt_only") {
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
  // Many publishers serve the whole essay to crawlers or on their AMP
  // page while hiding it from a plain server request. Both are cheap
  // single fetches and recover the full text on most paywall-lite sites.
  if (raw.length < 600 || CHALLENGE_RE.test(raw)) {
    const asCrawler = await fetchPlainText(url, {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    });
    if (asCrawler.length > raw.length && !CHALLENGE_RE.test(asCrawler)) raw = asCrawler;
  }
  if (raw.length < 600 || CHALLENGE_RE.test(raw)) {
    const viaAmp = await fetchAmp(url);
    if (viaAmp.length > raw.length && !CHALLENGE_RE.test(viaAmp)) raw = viaAmp;
  }
  // Some publishers sit behind bot checkpoints (e.g. Vercel/Cloudflare
  // challenges) that return a challenge page instead of the essay. A
  // plain-text reader proxy resolves those without a headless browser.
  if (raw.length < 600 || CHALLENGE_RE.test(raw)) {
    const viaReader = await fetchViaReader(url);
    if (viaReader.length > raw.length && !CHALLENGE_RE.test(viaReader)) raw = viaReader;
  }
  // Publishers that wall live scraping usually still have a public snapshot
  // in the Wayback Machine, which serves the full prose without challenges.
  if (raw.length < 600 || CHALLENGE_RE.test(raw)) {
    const viaArchive = await fetchViaArchive(url);
    if (viaArchive.length > 600 && !CHALLENGE_RE.test(viaArchive)) raw = viaArchive;
  }
  // Last resort: the feed entry's own body. Publishers that block scrapers
  // usually still syndicate the full text (or a long extract) in the feed,
  // and that text is perfectly readable by the model.
  let fromFeedExcerpt = false;
  if (meta.fallbackText && (raw.length < 400 || CHALLENGE_RE.test(raw))) {
    const feedText = stripText(meta.fallbackText);
    // Prefer the teaser over a bot-challenge page even when the challenge
    // markup happens to produce more characters.
    if (feedText.length >= 120) {
      raw = feedText;
      fromFeedExcerpt = true;
    }
  }

  // A feed excerpt is short by nature (often a two-line teaser), but it is
  // still real prose the model can summarise, tag and connect — far better
  // than dropping the piece entirely for publishers that wall scrapers.
  const minChars = fromFeedExcerpt ? 120 : 400;
  if (raw.length < minChars) {
    await upsertArticle(db, userId, url, sourceId, {
      title: meta.title ?? scraped?.title ?? url,
      author: meta.author ?? null,
      published_at: meta.publishedAt ?? null,
      raw_text: raw || null,
      word_count: raw ? raw.split(/\s+/).length : 0,
      status: "error",
      error_message: "extraction_blocked",
    });
    return { url, status: "error", reason: "extraction_blocked" };
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
      .update({
        status: "processed",
        // Transparency: mark pieces where only the feed teaser was readable,
        // so the archive and the discovery engine know the depth is shallow.
        error_message: fromFeedExcerpt ? "feed_excerpt_only" : null,
      })
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
async function fetchPlainText(
  url: string,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  try {
    const res = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml",
          ...extraHeaders,
        },
        redirect: "follow",
      },
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

/**
 * AMP variant lookup: `<link rel="amphtml">` when advertised, otherwise the
 * two conventional AMP paths. AMP documents are static prose by spec.
 */
async function fetchAmp(url: string): Promise<string> {
  const candidates: string[] = [];
  try {
    const res = await fetchWithRetry(
      url,
      { headers: { "User-Agent": USER_AGENT, "Accept": "text/html" }, redirect: "follow" },
      12000,
      0,
    );
    if (res.ok) {
      const head = (await res.text()).slice(0, 200_000);
      const amp = head.match(/<link[^>]+rel=["']amphtml["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
        head.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']amphtml["']/i)?.[1];
      if (amp) candidates.push(new URL(amp, url).toString());
    }
  } catch { /* fall through to conventional paths */ }
  try {
    const u = new URL(url);
    candidates.push(`${u.origin}${u.pathname.replace(/\/$/, "")}/amp${u.search}`);
    candidates.push(`${u.origin}${u.pathname}${u.search ? `${u.search}&` : "?"}amp=1`);
  } catch { /* unparsable url */ }

  for (const candidate of candidates) {
    if (!isSafeUrl(candidate)) continue;
    const text = await fetchPlainText(candidate);
    if (text.length > 600 && !CHALLENGE_RE.test(text)) return text;
  }
  return "";
}

/** Reader-proxy extraction for bot-walled pages. Returns "" on failure. */
async function fetchViaReader(url: string): Promise<string> {
  try {
    const res = await fetchWithRetry(
      `https://r.jina.ai/${url}`,
      { headers: { "Accept": "text/plain", "User-Agent": USER_AGENT } },
      20000,
      0,
    );
    if (!res.ok) return "";
    const text = await res.text();
    return text.length > 200_000 ? text.slice(0, 200_000) : text;
  } catch { return ""; }
}

/**
 * Fetches a full-text copy from the Wayback Machine. Blocked publishers are
 * usually archived there, and archive.org serves plain HTML to any client.
 */
async function fetchViaArchive(url: string): Promise<string> {
  try {
    const probe = await fetchWithRetry(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
      { headers: { "Accept": "application/json", "User-Agent": USER_AGENT } },
      12000,
      0,
    );
    if (!probe.ok) return "";
    const json = await probe.json().catch(() => null) as
      | { archived_snapshots?: { closest?: { available?: boolean; url?: string } } }
      | null;
    const snapshot = json?.archived_snapshots?.closest;
    if (!snapshot?.available || !snapshot.url) return "";
    // `id_` asks for the original response, without the archive's own banner.
    const rawUrl = snapshot.url.replace(/\/(\d{14})\//, "/$1id_/");
    const res = await fetchWithRetry(
      rawUrl.startsWith("http://") ? rawUrl.replace("http://", "https://") : rawUrl,
      { headers: { "Accept": "text/html", "User-Agent": USER_AGENT } },
      20000,
      0,
    );
    if (!res.ok) return "";
    const html = await res.text();
    const text = stripText(html);
    return text.length > 200_000 ? text.slice(0, 200_000) : text;
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
