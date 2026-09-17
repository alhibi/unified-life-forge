// Run with: bun test supabase/functions/fetch-rss/persistence.test.ts
// Imports the real handler; all remote modules, environment and fetch are mocked.
import { afterAll, beforeEach, expect, mock, test } from "bun:test";

type Row = Record<string, unknown>;
type Handler = (request: Request) => Promise<Response>;
interface FeedResponse {
  feeds: { count: number; parsedCount: number; storedCount: number; items: unknown[] }[];
  statuses: { status: string; itemCount: number; parsedCount: number; storedCount: number; error?: string }[];
  errors: string[];
}
let handler: Handler | undefined;
let articleError: string | null = "write rejected";
let readError: string | null = null;
let rejectWrite = false;
let existing: { link: string; full_content: string }[] = [];
const metaWrites: Row[] = [];
const articleWrites: Row[][] = [];
const client = {
  from(table: string) {
    return {
      select() {
        return {
          in: async () => ({ data: table === "rss_articles" ? existing : [], error: table === "rss_articles" && readError ? { message: readError } : null }),
          eq: () => ({ maybeSingle: async () => ({ data: { consecutive_failures: 0 }, error: null }) }),
        };
      },
      upsert: async (rows: Row | Row[]) => {
        if (table === "rss_feed_meta") {
          metaWrites.push(rows as Row);
          return { error: null };
        }
        articleWrites.push(rows as Row[]);
        if (rejectWrite) throw new Error("connection interrupted");
        return { error: articleError ? { message: articleError } : null };
      },
    };
  },
};
mock.module("https://deno.land/std@0.224.0/http/server.ts", () => ({
  serve: (callback: Handler) => { handler = callback; },
}));
mock.module("https://esm.sh/@supabase/supabase-js@2", () => ({ createClient: () => client }));
const originalDeno = Object.getOwnPropertyDescriptor(globalThis, "Deno");
Object.defineProperty(globalThis, "Deno", { configurable: true, value: {
  env: { get: (key: string) => key === "SUPABASE_SERVICE_ROLE_KEY" ? "test-service-token" : "https://db.invalid" },
} });
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  const response = new Response('<rss><channel><title>Test</title><item><title>Article</title><link>https://publisher.invalid/article</link><description>Summary</description></item></channel></rss>', {
    headers: { etag: '"new-version"', "last-modified": "Wed, 16 Sep 2026 00:00:00 GMT" },
  });
  Object.defineProperty(response, "url", { value: "https://publisher.invalid/feed" });
  return response;
}) as typeof fetch;
await import("./index.ts");
afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalDeno) Object.defineProperty(globalThis, "Deno", originalDeno);
  else Reflect.deleteProperty(globalThis, "Deno");
  mock.restore();
});

beforeEach(() => {
  articleError = null;
  readError = null;
  rejectWrite = false;
  existing = [];
});

async function refresh(): Promise<FeedResponse> {
  if (!handler) throw new Error("Server handler was not registered");
  metaWrites.length = 0;
  articleWrites.length = 0;
  const response = await handler(new Request("https://function.invalid", {
    method: "POST",
    headers: { authorization: "Bearer test-service-token", "content-type": "application/json" },
    body: JSON.stringify({ urls: ["https://publisher.invalid/feed"], store: true }),
  }));
  return response.json();
}

test("failed article persistence reports failure without advancing validators", async () => {
  articleError = "write rejected";
  existing = [];
  const body = await refresh();
  expect(articleWrites).toHaveLength(1);
  expect(body.statuses[0].status).toBe("error");
  expect(body.statuses[0].error).toContain("write rejected");
  expect(body.statuses[0].parsedCount).toBe(1);
  expect(body.statuses[0].storedCount).toBe(0);
  expect(body.feeds).toHaveLength(0);
  expect(body.errors).toHaveLength(1);
  expect(metaWrites).toHaveLength(1);
  expect(metaWrites[0]).not.toHaveProperty("etag");
  expect(metaWrites[0]).not.toHaveProperty("last_modified");
  expect(metaWrites[0].last_error).toContain("write rejected");
  expect(metaWrites[0].consecutive_failures).toBe(1);
});

test("successful writes report confirmed rows and commit validators", async () => {
  articleError = null;
  existing = [];
  const body = await refresh();
  expect(body.feeds[0]).toMatchObject({ count: 1, parsedCount: 1, storedCount: 1, items: [] });
  expect(body.statuses[0]).toMatchObject({ status: "ok", itemCount: 1, parsedCount: 1, storedCount: 1 });
  expect(metaWrites[0]).toMatchObject({ etag: '"new-version"', item_count_last: 1, last_error: null, consecutive_failures: 0 });
});

test("unchanged rows are not counted as stored", async () => {
  articleError = null;
  existing = [{ link: "https://publisher.invalid/article", full_content: "<p>Repeated body</p>" }];
  const body = await refresh();
  expect(body.feeds[0]).toMatchObject({ count: 1, parsedCount: 1, storedCount: 0 });
  expect(body.statuses[0]).toMatchObject({ status: "ok", parsedCount: 1, storedCount: 0 });
  expect(articleWrites).toHaveLength(0);
  expect(metaWrites[0].etag).toBe('"new-version"');
});

test("failed existing-content lookup aborts writes and validator commit", async () => {
  articleError = null;
  existing = [];
  readError = "lookup unavailable";
  try {
    const body = await refresh();
    expect(body.statuses[0]).toMatchObject({ status: "error", parsedCount: 1, storedCount: 0 });
    expect(body.statuses[0].error).toContain("lookup unavailable");
    expect(articleWrites).toHaveLength(0);
    expect(metaWrites[0]).not.toHaveProperty("etag");
  } finally { readError = null; }
});

test("rejected writes preserve per-feed failure and counts", async () => {
  existing = [];
  rejectWrite = true;
  try {
    const body = await refresh();
    expect(body.statuses?.[0]).toMatchObject({ status: "error", parsedCount: 1, storedCount: 0 });
    expect(body.statuses[0].error).toContain("connection interrupted");
    expect(metaWrites[0]).not.toHaveProperty("etag");
    expect(metaWrites[0]).not.toHaveProperty("last_modified");
  } finally { rejectWrite = false; }
});


