// Shared utilities for the reading edge functions. Kept dependency-free
// (no third-party imports) so each function bundles cleanly on Deno
// Edge runtime.

export const USER_AGENT =
  "Mozilla/5.0 (compatible; SmartHubReader/1.2; +https://github.com/alhibi/unified-life-forge)";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── SSRF guard ────────────────────────────────────────────────────────────
const PRIVATE_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127(?:\.\d+){3}$/,
  /^0\.0\.0\.0$/,
  /^10(?:\.\d+){3}$/,
  /^192\.168(?:\.\d+){2}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2}$/,
  /^169\.254(?:\.\d+){2}$/,
  /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])(?:\.\d+){2}$/,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /\.internal$/i,
  /\.local$/i,
  /\.localdomain$/i,
];

export function isSafeUrl(input: string): boolean {
  let u: URL;
  try { u = new URL(input); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (PRIVATE_HOSTNAME_PATTERNS.some((re) => re.test(host))) return false;
  return true;
}

// ─── Fetch with timeout + retry ────────────────────────────────────────────
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retries = 1,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 + 600 * attempt));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 + 600 * attempt));
      }
    }
  }
  throw lastErr ?? new Error("fetch failed");
}

// ─── HTML helpers ──────────────────────────────────────────────────────────
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, n) => String.fromCodePoint(parseInt(n, 16)),
    );
}

export function stripText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanArticleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(
      /<div[^>]*class="[^"]*(?:share|social|comment|related|sidebar|widget|ad-|advertisement|newsletter|subscribe|tag-bar|breadcrumb|nav)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      "",
    )
    .replace(/class="[^"]*"/gi, "")
    .replace(/style="[^"]*"/gi, "")
    .replace(/id="[^"]*"/gi, "")
    .replace(/data-[a-z-]+="[^"]*"/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractContainer(
  html: string,
  startIdx: number,
): string | null {
  const tagEnd = html.indexOf(">", startIdx);
  if (tagEnd === -1) return null;
  let depth = 1;
  let i = tagEnd + 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return html.substring(tagEnd + 1, nextClose);
      i = nextClose + 6;
    }
  }
  return null;
}

export function extractFromJsonLd(html: string):
  | { body?: string; image?: string; title?: string; siteName?: string }
  | null
{
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
        ? parsed["@graph"]
        : [parsed];
      for (const c of candidates) {
        const t = c?.["@type"];
        const isArticle = typeof t === "string"
          ? /Article|NewsArticle|BlogPosting/i.test(t)
          : Array.isArray(t)
          ? t.some((x: string) => /Article|NewsArticle|BlogPosting/i.test(x))
          : false;
        if (!isArticle) continue;
        const body = typeof c.articleBody === "string"
          ? c.articleBody
          : undefined;
        const image = typeof c.image === "string"
          ? c.image
          : Array.isArray(c.image)
          ? typeof c.image[0] === "string" ? c.image[0] : c.image[0]?.url
          : c.image?.url;
        const title = typeof c.headline === "string" ? c.headline : undefined;
        const siteName = c.publisher?.name || undefined;
        if (body || image || title) return { body, image, title, siteName };
      }
    } catch { /* bad JSON-LD, try next */ }
  }
  return null;
}

export function extractOgImage(html: string): string | null {
  const og = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  if (og?.[1]) return og[1];
  const tw = html.match(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  );
  return tw?.[1] || null;
}

export function extractMeta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m?.[1] || null;
}

export function extractTitle(html: string): string | null {
  const og = extractMeta(html, "og:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(stripText(m[1])) : null;
}

export function extractInlineImages(html: string): string[] {
  const imgs: string[] = [];
  const re =
    /<img[^>]*?(?:src|data-src|data-original)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (
      url.startsWith("http") &&
      !/pixel|1x1|tracking|spacer|blank\.gif/i.test(url) &&
      !imgs.includes(url)
    ) imgs.push(url);
  }
  const srcsetRe = /<img[^>]*?srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (first && first.startsWith("http") && !imgs.includes(first)) {
      imgs.push(first);
    }
  }
  return imgs;
}

// ─── Multi-strategy article extraction ─────────────────────────────────────
export interface ScrapedArticle {
  title: string;
  html: string;
  ogImage?: string;
  siteName?: string;
  description?: string;
}

export async function scrapeArticle(
  url: string,
  timeoutMs = 12000,
): Promise<ScrapedArticle | null> {
  if (!isSafeUrl(url)) return null;
  let res: Response;
  try {
    res = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "ar,en;q=0.7",
        },
        redirect: "follow",
      },
      timeoutMs,
    );
  } catch { return null; }
  if (!res.ok) return null;
  if (!isSafeUrl(res.url)) return null;
  const html = await res.text();

  const ogImage = extractOgImage(html) || undefined;
  const ld = extractFromJsonLd(html);
  const title = ld?.title || extractTitle(html) || "";
  const siteName = ld?.siteName ||
    extractMeta(html, "og:site_name") ||
    new URL(url).hostname.replace(/^www\./, "");
  const description = extractMeta(html, "og:description") ||
    extractMeta(html, "description") || "";

  // Strategy 1 — JSON-LD articleBody
  if (ld?.body && ld.body.length > 300) {
    const paras = ld.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return {
      title,
      siteName,
      description,
      html: `<p>${paras.join("</p><p>")}</p>`,
      ogImage: ld.image || ogImage,
    };
  }

  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Strategy 2 — <article> or <main>
  for (const tag of ["article", "main"]) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = clean.match(re);
    if (m && stripText(m[1]).length > 300) {
      return {
        title,
        siteName,
        description,
        html: cleanArticleHtml(m[1]),
        ogImage,
      };
    }
  }

  // Strategy 3 — itemprop=articleBody / known content classes
  const itemprop = clean.match(
    /<[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
  );
  if (itemprop && stripText(itemprop[1]).length > 300) {
    return {
      title,
      siteName,
      description,
      html: cleanArticleHtml(itemprop[1]),
      ogImage,
    };
  }

  const contentClasses = [
    "entry-content", "article-body", "article-content", "post-content",
    "story-body", "news-content", "wysiwyg", "content-body",
    "single-content", "s-ct-inner", "rbct", "post__content",
    "rich-text", "story",
  ];
  for (const cls of contentClasses) {
    const idx = clean.indexOf(cls);
    if (idx !== -1) {
      const before = clean.lastIndexOf("<div", idx);
      if (before !== -1) {
        const content = extractContainer(clean, before);
        if (content && stripText(content).length > 300) {
          return {
            title,
            siteName,
            description,
            html: cleanArticleHtml(content),
            ogImage,
          };
        }
      }
    }
  }

  // Strategy 4 — paragraph cluster
  const pRe = /<p[^>]*>[\s\S]*?<\/p>/gi;
  const ps: string[] = [];
  let pm;
  while ((pm = pRe.exec(clean)) !== null) {
    const text = stripText(pm[0]);
    if (text.length > 40) ps.push(pm[0]);
  }
  if (ps.length >= 4) {
    return {
      title,
      siteName,
      description,
      html: cleanArticleHtml(ps.join("\n")),
      ogImage,
    };
  }

  return ogImage
    ? { title, siteName, description, html: "", ogImage }
    : null;
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export type AuthResult =
  | { ok: true; userId: string; token: string; serviceRole?: false }
  | { ok: true; serviceRole: true; token: string; userId?: undefined }
  | { ok: false; status: number; error: string };

/**
 * Public-friendly auth resolver used by edge functions whose underlying
 * resource is openly readable (e.g. `rss_articles` carries an
 * "Anyone can read articles" RLS policy and the `search_rss_articles`
 * RPC is `GRANT EXECUTE ... TO anon`).
 *
 * Unlike `requireUser`, this never rejects anonymous callers — it just
 * reports whether a real session JWT was presented and forwards
 * whatever bearer the platform passed through (anon key, session JWT,
 * or service-role key) so the downstream supabase-js client honors
 * the same RLS context as the caller.
 */
export type OptionalAuthResult = {
  ok: true;
  /** Original bearer (anon key, session JWT, or service role). May be
   *  null when the request arrived without an Authorization header at
   *  all (only possible when `verify_jwt = false` in config.toml). */
  token: string | null;
  /** Resolved auth.users id when a session JWT was presented. */
  userId?: string;
  /** True when the bearer matches `SUPABASE_SERVICE_ROLE_KEY`. */
  serviceRole: boolean;
  /** True when the caller is anonymous (no session, no service role). */
  anonymous: boolean;
};

export async function optionalUser(req: Request): Promise<OptionalAuthResult> {
  const authHeader = req.headers.get("authorization") ||
    req.headers.get("Authorization");

  // No bearer at all → still allow as anonymous. The platform is
  // expected to gate this with `verify_jwt = false` for genuinely
  // public functions; otherwise the platform would have already
  // returned 401 before we got here.
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: true, token: null, serviceRole: false, anonymous: true };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: true, token: null, serviceRole: false, anonymous: true };
  }

  // Internal callers (cron / fetch-rss-cron) authenticate with the
  // service-role key directly. Compare against the env var so a
  // forged JWT claim can't elevate.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { ok: true, token, serviceRole: true, anonymous: false };
  }

  // Try to resolve as a real user JWT. If `auth.getUser` rejects (the
  // bearer is the anon key, an expired session, or anything else
  // that doesn't represent a user), we treat the caller as anonymous
  // rather than failing the whole request — public archive reads do
  // not require an account.
  try {
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data, error } = await sb.auth.getUser(token);
    if (!error && data?.user) {
      return {
        ok: true,
        token,
        userId: data.user.id,
        serviceRole: false,
        anonymous: false,
      };
    }
  } catch { /* network / parse glitch — fall through to anonymous */ }

  return { ok: true, token, serviceRole: false, anonymous: true };
}

export async function requireUser(req: Request): Promise<AuthResult> {
  const auth = req.headers.get("authorization") ||
    req.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = auth.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: "Empty bearer token" };

  // Allow internal callers (cron / fetch-rss-cron) that authenticate with
  // the service-role key directly. We compare against the env var so a
  // forged JWT claim can't elevate.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { ok: true, serviceRole: true, token };
  }

  // Lazy import to avoid pulling supabase-js into functions that don't
  // need DB writes.
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2"
  );
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }
  return { ok: true, userId: data.user.id, token };
}

export function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
