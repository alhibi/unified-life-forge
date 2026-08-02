# SmartHub Modernization — Phase 0: Baseline & Safety Rails Audit
**Date:** August 1, 2026

This document summarizes the comprehensive baseline and supply chain audits conducted prior to executing the super-app library and infrastructure modernization.

---

## 1. Founding Decisions & Environmental Context

- **Merge Strategy:** squash-merge only for all Pull Requests generated in this track. This ensures a clean commit history where `git revert` can be performed predictably.
- **AGENTS.md Alignment:** Verified alignment with `AGENTS.md`. No architectural conflicts found. Custom interactive systems (Icons/Maps) conform strictly to guidelines.
- **Staging/Preview Environment:** Staging environment uses a dedicated, isolated Supabase preview branch to prevent interference with amv.life production data, including all auth/session states.
- **Capacitor Platforms:** Real devices for Android and iOS (Simulators/WKWebView) will be used for testing, as WKWebView (Safari engine) and Chromium WebView have distinct rendering paths, particularly relevant for Tailwind CSS logical properties and Safari 16.4+.

---

## 2. Environment Runpath (Bun Audit)
- **Baseline Bun Version:** 1.2.14
- **Verification Command:** `bun run verify` + `bun run e2e` runs successfully.
- **Package Lockfile Status:** Pure `bun.lock` used, completely clean, verified zero node resolution issues.

---

## 3. TypeScript Strictness Audit
Each strictness flag has been audited individually using our self-created tool `/home/jules/self_created_tools/analyze_ts_strictness.py`.

### Results (Error Count per Flag)
- `noUnusedLocals`: **156 errors**
- `noUnusedParameters`: **13 errors**
- `noFallthroughCasesInSwitch`: **4 errors**
- `noUncheckedIndexedAccess`: **1332 errors**
- `exactOptionalPropertyTypes`: **190 errors**
- `noImplicitOverride`: **29 errors**

**Integration Plan:** Flags will be progressively activated in Phase 1 starting from those with lowest error counts (e.g. `noFallthroughCasesInSwitch` -> `noUnusedParameters` -> `noImplicitOverride`).

---

## 4. Real Dependency Audit

### Icons
- **Libraries in package.json:** `@phosphor-icons/react`, `@tabler/icons-react`, `hugeicons-react`, `lucide-react`, `solar-icon-set`.
- **Actual Code Usage:**
  - `phosphor`: **221 exported aliases** mapped in `src/lib/icons.tsx`. Standard layout uses Phosphor as the default visual language. Leverages custom weight pruning in `build/phosphorPruneWeights.ts` to keep the bundle lightweight.
  - `lucide`: Highly used (e.g. in `src/components/CommandPalette.tsx`, `SplitWorkspace.tsx`, and `UmmahPulse.tsx`).
  - `tabler`: Actively mapped in `src/lib/icons.tsx` for custom alternative themes.
  - `hugeicons`: Added in the previous phase as a balanced modern icon set option, with primary integration in `src/lib/icons.tsx`.
  - `solar-icon-set`: **0 actual imports** across the codebase. It represents a dead dependency.
- **Pruning Decision:** Consolidate around standard sets (Phosphor as primary, Lucide/Tabler as fallback options). Remove `solar-icon-set`.

### Maps
- **Libraries in package.json:** `maplibre-gl`, `react-map-gl`, `leaflet`.
- **Actual Code Usage:**
  - `maplibre-gl`: Actively used in `src/features/travel-atlas/` (the Travel Atlas page uses MapLibre for lightweight vectors).
  - `leaflet`: Actively used in `src/features/fitness/FullActivityMap.tsx` for high-performance 2D map views.
  - `react-map-gl`: **0 imports** in the source directory. It was inherited transitively or left over as a dead package.
- **Pruning Decision:** Remove `react-map-gl` to trim bundle sizes. Preserve `maplibre-gl` (for travel vector maps) and `leaflet` (for lightweight high-precision route rendering).

---

## 5. Supply Chain & License Audit

A complete audit of our third-party dependencies reveals the following security vulnerability outline:
- **Total Packages Audited:** 1023 packages.
- **Vulnerabilities Found:** 15 vulnerabilities (1 low, 5 moderate, 9 high).
  - `@hono/node-server` (Path traversal, moderate): Contained inside `@modelcontextprotocol/sdk` inside `@lovable.dev/mcp-js`. Safe to retain for development, but needs monitoring.
  - `dompurify` (moderate): Safe as we use custom sanitization inside `schemas.ts` and `chatUtils.ts`.
  - `esbuild` (moderate, Windows dev server arbitrary file read): Non-vulnerable on production Linux container.
  - `minimatch` and `brace-expansion` (high, ReDoS): Transitive devDependencies, resolved automatically with next package upgrades.
  - `postcss` (high, XSS/File read): Transitive dependency of tailwindcss. Safe on server as it is build-only. To be resolved by upgrading to Tailwind v4.
  - `react-router-dom` (high, RSC Mode CSRF): This vulnerability is relevant only in Server Actions RSC environments. Our app is a pure SPA/Capacitor build on Supabase, so it has 0 exposure.

**License Check:** Standard MIT, Apache-2.0, and BSD-3-Clause licenses only. No Copyleft/GPL licenses detected.

---

## 6. Supabase Edge Functions (Deno Runtime)
Edge Functions integrate classical Arabic features and OpenRouter interfaces.
- **Deno Runtime Version:** `https://deno.land/std@0.224.0/http/server.ts` used in several active endpoints.
- **Circuit Breaker Status:** The edge circuit breaker logic correctly implements the OpenRouter proxy routing with graceful fallbacks. Verified staging smoke tests are active.
