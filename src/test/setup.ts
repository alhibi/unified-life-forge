import "@testing-library/jest-dom";
// Dexie-backed surfaces (PKM, reading, journal drafts) open IndexedDB during
// mount. jsdom has none, so the open rejected AFTER the test finished and
// Vitest reported it as an unhandled error even though the route mounted.
// The auto entry installs a complete in-memory implementation once.
import "fake-indexeddb/auto";

// Node 26 ships a global Event/CustomEvent distinct from jsdom's. A DOM
// node only accepts its own realm's Event in dispatchEvent, so a library
// that does new Event(...) against the Node global threw
// 'The "event" argument must be an instance of Event' asynchronously —
// after the route had already mounted. Point the globals at jsdom's.
Object.assign(globalThis, {
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  EventTarget: window.EventTarget,
});

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
 * Browser observer APIs that jsdom does not implement.
 *
 * Without these, every screen that measures itself throws during mount and is
 * swallowed by an ErrorBoundary — which made an entire surface of the app
 * untestable rather than merely untested. The 2026-10-05 audit measured the
 * blast radius: all seven `/settings/*` screens, `/journal`,
 * `/travel-atlas/countries` and `/diwan/library/poets` could not be rendered
 * by ANY spec, so no test could ever have covered them.
 *
 * These are inert no-op stubs on purpose. They let a component mount and reach
 * its real logic; they deliberately do NOT simulate resize or intersection
 * events. A spec that needs an element to actually become visible must drive
 * the callback itself — otherwise a passing test would be asserting against a
 * fake layout engine.
 */
class NoopObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver;
}
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver =
    NoopObserver as unknown as typeof IntersectionObserver;
}

// jsdom implements neither of these layout methods. `scrollIntoView` in
// particular is called as a cosmetic nicety in several list views, where a
// missing method took the whole page down.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

// jsdom ships `window.scrollTo` as a stub that logs "Not implemented" to the
// console on every call. Scroll restoration runs on most route changes here,
// which buried real failures under tens of thousands of lines of noise.
window.scrollTo = () => {};
window.scrollBy = () => {};

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

/**
 * Realtime transports do not belong in jsdom. Supabase opens a WebSocket on
 * mount; under Node 26 that resolves to undici's WebSocket, whose internal
 * EventTarget rejects the jsdom Event dispatched into it — an unhandled
 * exception that fails the smoke process even though every route mounted.
 * This inert transport lets the client construct, then stays silent.
 */
class InertWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readyState = 0;
  url = '';
  protocol = '';
  onopen = null;
  onclose = null;
  onerror = null;
  onmessage = null;
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return false; }
  send() {}
  close() { this.readyState = 3; }
}
Object.defineProperty(globalThis, 'WebSocket', {
  writable: true,
  configurable: true,
  value: InertWebSocket,
});
