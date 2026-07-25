import "@testing-library/jest-dom";
import { readFile } from "node:fs/promises";
import path from "node:path";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

/**
 * Serve `public/` over `fetch` for root-relative paths.
 *
 * Some modules load large static datasets as runtime assets instead of
 * bundling them — `src/features/diwan/data/poetryData.ts` fetches
 * `/data/diwan-poetry.json`, for example. In the browser the dev server and
 * the production host serve those from `public/`; jsdom has no server, so
 * without this shim every such fetch would fail and the module would silently
 * degrade to empty data, making the specs assert nothing.
 *
 * Only root-relative paths are intercepted. Absolute URLs and any path not
 * present in `public/` fall through to the real `fetch`, so a spec that wants
 * to stub a network call still can.
 */
const PUBLIC_DIR = path.resolve(__dirname, "../../public");
const realFetch = globalThis.fetch;

globalThis.fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (url.startsWith("/")) {
    // Strip any query string; static assets are addressed by path only.
    const relative = url.split("?")[0].replace(/^\/+/, "");
    const filePath = path.join(PUBLIC_DIR, relative);

    // Refuse to escape public/ — a malformed path in a spec should fail
    // loudly rather than read an arbitrary file from the repo.
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
      return new Response(null, { status: 403, statusText: "Forbidden" });
    }

    try {
      const body = await readFile(filePath);
      const type = relative.endsWith(".json")
        ? "application/json"
        : "application/octet-stream";
      return new Response(new Uint8Array(body), {
        status: 200,
        headers: { "content-type": type },
      });
    } catch {
      return new Response(null, { status: 404, statusText: "Not Found" });
    }
  }

  return realFetch(input as RequestInfo, init);
}) as typeof globalThis.fetch;
