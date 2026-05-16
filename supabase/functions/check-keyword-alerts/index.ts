import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  stripText,
} from "../_shared/rss-utils.ts";

/**
 * check-keyword-alerts — runs on a cron schedule (see migration
 * 20260516221000_rss_cron.sql). For every enabled keyword_alert row,
 * scans rss_articles whose pub_date is newer than the alert's
 * last_check_at and inserts hits into keyword_alert_hits.
 *
 * The function uses the service role to bypass RLS — the per-user
 * isolation is enforced by the WHERE clause on user_id.
 *
 * Match modes:
 *   - 'any':        the keyword appears anywhere in title/desc/body
 *   - 'whole_word': matched as a whole token (\bword\b)
 *   - 'phrase':     exact substring match (case-insensitive)
 *
 * We also accept a manual invocation: POST { user_id?, alert_id? } to
 * trigger an immediate run for one user / alert (used by the UI's
 * "test alert" button).
 */

interface Alert {
  id: string;
  user_id: string;
  keyword: string;
  source_filter: string[] | null;
  match_mode: "any" | "whole_word" | "phrase";
  last_check_at: string;
}

interface Article {
  link: string;
  title: string;
  description: string;
  full_content: string | null;
  pub_date: string | null;
  source_name: string;
}

function normalize(s: string): string {
  // Lowercase + strip diacritics so "ذكاء" matches "ذِكاء" too.
  return s
    .normalize("NFKD")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .toLowerCase();
}

function matches(article: Article, alert: Alert): boolean {
  const haystack = normalize(
    [
      article.title,
      article.description,
      stripText(article.full_content || ""),
    ].join(" \n "),
  );
  const needle = normalize(alert.keyword);
  if (!needle) return false;
  switch (alert.match_mode) {
    case "phrase":
    case "any":
      return haystack.includes(needle);
    case "whole_word": {
      // Build a regex with simple Unicode word boundaries (\b doesn't
      // play well with Arabic, so we use lookaround on whitespace /
      // start-end / common punctuation).
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,
        "u",
      );
      return re.test(haystack);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Optional manual scope from the request body
  let scope: { user_id?: string; alert_id?: string } = {};
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body === "object") {
        if (typeof body.user_id === "string") scope.user_id = body.user_id;
        if (typeof body.alert_id === "string") scope.alert_id = body.alert_id;
      }
    } catch { /* empty body is fine */ }
  }

  // 1. Load enabled alerts (optionally narrowed)
  let q = sb.from("keyword_alerts")
    .select("id, user_id, keyword, source_filter, match_mode, last_check_at")
    .eq("enabled", true);
  if (scope.user_id) q = q.eq("user_id", scope.user_id);
  if (scope.alert_id) q = q.eq("id", scope.alert_id);

  const { data: alerts, error: alertsErr } = await q;
  if (alertsErr) return jsonResponse({ error: alertsErr.message }, 500);

  if (!alerts || alerts.length === 0) {
    return jsonResponse({ checked: 0, hits: 0, alerts: 0 });
  }

  // 2. Load all articles published since the earliest last_check_at,
  //    once. Then filter per-alert in memory. This is much cheaper
  //    than running one query per alert when many alerts overlap.
  const earliest = alerts.reduce<string>(
    (min, a) => a.last_check_at < min ? a.last_check_at : min,
    alerts[0].last_check_at,
  );

  const { data: articles, error: artErr } = await sb.from("rss_articles")
    .select("link, title, description, full_content, pub_date, source_name")
    .gte("pub_date", earliest)
    .order("pub_date", { ascending: false })
    .limit(2000);
  if (artErr) return jsonResponse({ error: artErr.message }, 500);
  const allArticles = (articles ?? []) as Article[];

  // 3. For each alert, find new matches and prepare hit rows.
  const hitsToInsert: {
    alert_id: string;
    user_id: string;
    article_link: string;
    article_title: string;
    source_name: string;
  }[] = [];
  const alertCheckpoints: { id: string; last_check_at: string }[] = [];

  let totalChecked = 0;
  for (const alert of alerts as Alert[]) {
    const since = alert.last_check_at;
    const subset = allArticles.filter((a) =>
      a.pub_date && a.pub_date > since &&
      (!alert.source_filter || alert.source_filter.length === 0 ||
        alert.source_filter.includes(a.source_name))
    );
    totalChecked += subset.length;

    for (const article of subset) {
      if (matches(article, alert)) {
        hitsToInsert.push({
          alert_id: alert.id,
          user_id: alert.user_id,
          article_link: article.link,
          article_title: article.title,
          source_name: article.source_name,
        });
      }
    }
    alertCheckpoints.push({
      id: alert.id,
      last_check_at: new Date().toISOString(),
    });
  }

  // 4. Insert hits (UNIQUE constraint dedupes). Batch in 100s.
  let inserted = 0;
  for (let i = 0; i < hitsToInsert.length; i += 100) {
    const batch = hitsToInsert.slice(i, i + 100);
    const { error, count } = await sb.from("keyword_alert_hits")
      .upsert(batch, { onConflict: "alert_id,article_link", count: "exact" });
    if (!error && typeof count === "number") inserted += count;
  }

  // 5. Advance each alert's last_check_at.
  for (const cp of alertCheckpoints) {
    await sb.from("keyword_alerts")
      .update({ last_check_at: cp.last_check_at })
      .eq("id", cp.id);
  }

  return jsonResponse({
    checked: totalChecked,
    hits: hitsToInsert.length,
    alerts: alerts.length,
    inserted,
  });
});
