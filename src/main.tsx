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
