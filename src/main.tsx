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
import { scrubVerboseDetails } from "@/components/ErrorBoundary";
import { instrumentWebVitals } from "./utils/vitals";

// Centralized Observability & Telemetry Readiness
const telemetryLogBuffer: Array<{
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  route: string;
}> = [];

function captureTelemetryError(type: string, message: string, stack?: string) {
  const cleanMsg = scrubVerboseDetails(message);
  const cleanStack = stack ? scrubVerboseDetails(stack) : undefined;
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    message: cleanMsg,
    stack: cleanStack,
    route: window.location.pathname,
  };
  telemetryLogBuffer.push(logEntry);
  if (telemetryLogBuffer.length > 100) telemetryLogBuffer.shift(); // Keep last 100 entries

  // In production this would write directly to Sentry, Datadog or a custom telemetry drain.
  console.warn(`[Telemetry Intercept - ${type}]:`, cleanMsg);
}

window.addEventListener('error', (event) => {
  captureTelemetryError('UncaughtError', event.message, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  captureTelemetryError('UnhandledRejection', message, stack);
});

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
