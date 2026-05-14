/* entry */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ─── Web Native 2026: Service Worker + Speculation Rules ──────────────────────
// Registered after first paint so they never block initial render.
if (typeof window !== "undefined") {
  // Service Worker — offline shell + asset caching.
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* silent — SW is a progressive enhancement */
        });
    });
  }

  // Speculation Rules — prerender likely-next pages on idle/hover so first
  // navigation is sub-100 ms. Feature-detected via HTMLScriptElement.supports
  // so we don't waste bytes on unsupported browsers.
  type ScriptElementWithSupports = typeof HTMLScriptElement & {
    supports?: (type: string) => boolean;
  };
  const ScriptCtor = HTMLScriptElement as ScriptElementWithSupports;
  const supportsSpeculation =
    typeof ScriptCtor.supports === "function" &&
    ScriptCtor.supports("speculationrules");

  if (supportsSpeculation) {
    // SPA-friendly: prefetch (not prerender) the top routes so the route chunk
    // and shell are warm in cache before the user taps. Prerender is avoided
    // intentionally because the same /index.html shell handles all routes and
    // a double-render could confuse stateful providers (auth, theme, etc.).
    const script = document.createElement("script");
    script.type = "speculationrules";
    script.text = JSON.stringify({
      prefetch: [
        {
          urls: ["/", "/games", "/duas", "/diwan", "/chat", "/settings", "/reading"],
          eagerness: "moderate",
        },
      ],
    });
    document.head.appendChild(script);
  }
}
