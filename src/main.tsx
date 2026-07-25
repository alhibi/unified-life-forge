/* entry */
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
// Atmospheric Intelligence Engine typography — restraint over noise.
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/montserrat/300.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import { bootMotion } from "./lib/bootMotion";
import { initTelemetry } from "./lib/telemetry";
import { instrumentWebVitals } from "./utils/vitals";

// Error telemetry. Installs the global error/unhandledrejection listeners and
// forwards scrubbed events to Sentry when VITE_SENTRY_DSN is configured,
// otherwise keeps them in an in-memory ring buffer readable via
// window.__telemetry(). Installed first so failures during the rest of boot
// are captured too. See src/lib/telemetry.ts.
initTelemetry();

// Native-feel motion setup: honor prefers-reduced-motion globally,
// promote <body> to a GPU layer, and pre-warm the compositor before
// the first user interaction. See bootMotion.ts for rationale.
bootMotion();

// App-shell service worker. Replaces the fonts-only worker: the shell and
// every fingerprinted asset are now cached, so the app survives a reload with
// no connection — which the PWA manifest and the offline toast already
// promised. A pending update is announced instead of applied silently.
registerServiceWorker((applyUpdate) => {
  void import("sonner").then(({ toast }) => {
    toast("نسخة جديدة من التطبيق جاهزة", {
      description: "أعِد التحميل لتطبيق التحديث.",
      duration: Infinity,
      action: { label: "تحديث", onClick: applyUpdate },
    });
  });
});

// Instrument Web Vitals performance telemetry
instrumentWebVitals();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
