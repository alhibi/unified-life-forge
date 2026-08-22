// Bridge so the atlas-scout edge function can import the pipeline core that
// lives with the web app's tests (vitest owns src/**; edge runtime owns this
// directory). Re-exported verbatim — the single source of truth is
// src/features/travel-atlas/lib/scoutPipeline.ts.
//
// Deno edge functions bundle relative imports outside their own folder fine,
// and the source module is deliberately dependency-free (no `@/` alias, no
// npm imports), which is what makes it consumable from both runtimes.
export * from "../../src/features/travel-atlas/lib/scoutPipeline.ts";
