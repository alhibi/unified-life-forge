/* entry */
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerFontsServiceWorker } from "./lib/registerFontsSw";
import { bootMotion } from "./lib/bootMotion";

// Native-feel motion setup: honor prefers-reduced-motion globally,
// promote <body> to a GPU layer, and pre-warm the compositor before
// the first user interaction. See bootMotion.ts for rationale.
bootMotion();

registerFontsServiceWorker();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
