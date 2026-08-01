# 🏛️ Zen Elite Super-App — Master Architectural Blueprint & Memory

This document is the absolute, non-negotiable operational memory and contract for all future development, code generators, and AI agents interacting with the `smarthub` repository. It is written to ensure absolute consistency across all features, layouts, systems, and dependencies.

---

## 📖 1. The Design Philosophy: "Quiet Luxury / Zen Elite"
The Super-App is governed by the **Zen Elite / Quiet Luxury** design framework. It demands extreme restraint, pixel-perfect alignment, and tactile interfaces that feel premium and organic.

### 📐 Spacing & Grid System (The Mathematical 8px Grid)
All layouts must adhere strictly to the mathematical grid. No ad-hoc spacing values are permitted.
- **Base Grid Unit:** `8px`
- **Spacing Scale:**
  - `4px` (micro adjustments)
  - `8px` (gaps, inline padding)
  - `12px` (compact padding)
  - `16px` (standard card padding, margins)
  - `24px` (section gaps, outer padding)
  - `32px` (large structural gaps)
  - `48px` / `64px` (extreme structural offsets)
- **Component Border-Radii:**
  - **Inputs / Controls:** `8px` (defined via `--r-md` / `10px` or `8px` calibrated scale)
  - **Buttons:** `8px` / `10px`
  - **Cards:** `12px` (canonical radius)
  - **Sections / Panels:** `16px` (canonical section radius)

### 🎨 Typography & Fonts
- **Default Display Font:** `Amiri` (serif, elegant, editorial classical Arabic styling).
- **Default Body Font:** `IBM Plex Sans Arabic` or `Noto Sans Arabic` (highly readable, clean modern typography).
- **Numeric Font Stack:** `Montserrat` (primary geometric font for numbers, clocks, and metrics).
- **Tabular Mono Font:** `IBM Plex Mono` (for high-frequency status logs, durations, and tabular alignments).
- **Layout Invariant:** Tabular numbers must always use the `tabular-nums` CSS class to prevent visual jumping during data updates.
- **Typographic Scale Multipliers:**
  - **Header line-height:** `1.2`
  - **Body line-height:** `1.6`

### 🌙 Luxury Theme Calibration ("Obsidian Luxury")
- **Canvas / Background:** 3.0% – 3.5% Lightness (Pure Sub-Black `#080808` or `#09090a`).
- **Card Surfaces:** 5.0% – 6.0% Lightness (`#0d0d0d` or `#0f0f0f`).
- **Component Borders:** 9.0% – 10.0% Lightness (`#181818` or `#1a1a1a`).
- **Copper Accent (`--live` / `#B8492E` / `#8a5b3d`):** Used strictly as the *sole* chromatic highlight for active states, live indicators, clock tickers, and unread badges. Never use decorative colors or glowing gradients without architectural justification.

---

## 🛠️ 2. Type System & Zod Schema Integrity
The Super-App runs on a zero-warning TypeScript type system with strict validation on every data boundary.

### 🚫 Rules of Type Safety
1. **Zero `any` Types:** The `any` type is strictly prohibited across all feature pages, API responses, and database rows. Every entity must be fully typed.
2. **Discriminated State Unions:** Complex asynchronous state trees, fetch states, and system action trackers must use Discriminated Unions (e.g., `AsyncState<T>` or `SystemAction`).
3. **Zod Validation at Every Edge:** All data entering the client from Supabase, external APIs (like GDELT), or user inputs must pass through Zod validators defined in `src/utils/validation/schemas.ts` and `src/utils/validation.ts`.
4. **API Envelope Standardization:** Always wrap network responses in the structured `ApiResponseEnvelopeSchema` containing unified `data`, `error`, `meta`, and `status` fields.

---

## ⚡ 3. Global & Local State Management (Zustand)
Global states (Auth, System, Fitness) are managed via robust, transaction-safe Zustand stores.

### 🛡️ State Management Best Practices
1. **Never Render-Write:** State dispatchers (e.g., `setState`, `setTheme`, `login`) must never be called directly inside a synchronous React render body. Always wrap them inside `useEffect` or event callbacks.
2. **Persistence Rules:** Persistent stores (`zustand/middleware/persist`) must explicitly specify the keys to save via `partialize` methods, preventing transient variables (like error states or temporary flags) from bloating the persistent storage.
3. **Transactional Rollbacks:** State modifiers must support rollback safety. If a transaction fails (e.g., updating a user profile with invalid data), the store must immediately restore the last known valid state.
4. **Session Caps:** Active logins and credentials cached inside storage must be capped to prevent memory exhaustion and storage attacks (maximum 10 active concurrent sessions).

---

## 📡 4. Offline Resilience & Synchronous Queue (IndexedDB/Storage)
The Super-App is built to survive in low-connectivity, extreme environments.

- **Automated Sync Queue:** Offline mutations are queued using the `useOfflineStorage` hook.
- **Automatic Sync Triggers:** Once the network transitions back to `online`, the queue automatically processes pending transactions with an exponential backoff retry policy (configurable up to 3 retries).
- **Process Lock:** To completely eliminate race conditions, double processing, or overlapping sync requests, the queue implements a hard `syncStatus === 'syncing'` lock.

---

## 📁 5. Architectural Map (Feature-Sliced Design)
The repository enforces a strict, modular Feature-Sliced Design (FSD) structure located under `src/features/`.

```
src/
├── components/           # Shareable UI Primitives (PageShell, Section, AppCard, ResponsiveDrawer)
├── contexts/             # Global Engine contexts (SystemEngine, WebAuthn, SplitPane)
├── features/             # Feature-isolated modules (diwan, fitness, archive, pythia, knowledge)
│   └── <feature>/
│       ├── components/   # Feature-specific layout items
│       ├── pages/        # Route entry points wrapped in <PageShell>
│       ├── hooks/        # Feature hooks & sync logic
│       ├── types.ts      # Explicit domain interfaces
│       └── api.ts        # Direct API integrations (prohibits raw Supabase imports in components)
├── hooks/                # Global infrastructure hooks (useNetworkStatus, usePresence)
├── stores/               # Global Zustand stores (authStore, fitnessStore, systemStore)
└── utils/                # Pure utility libraries (validation, math, themeEngine)
```

### 🚫 Core Architectural Rules
- **No Direct Supabase Imports:** Standard UI components must *never* import the Supabase client directly from `@/integrations/supabase/client`. All database operations must be isolated inside `api.ts` within the respective feature directory, or inside global service modules.
- **Compose, Don't Build:** Custom cards, customized margins, custom buttons, or hardcoded hexes are strictly banned. Always compose layouts using semantic classes (`bg-background`, `text-foreground`, `border-border`) and shareable UI primitives from `src/components/ui/app-shell.tsx`.

---

## 📳 6. Target Hardware Optimization (Leading Devices)
To accommodate leading mobile phones and high-refresh-rate displays, the Super-App implements deep performance optimizations:

1. **Hardware & Battery Monitoring:** Automatically monitors battery life and internet connections. If battery saver is active, Framer Motion frame-rates are automatically capped and spring frequencies are softened.
2. **GPU Promotion:** Core animated elements (route wrappers, persistent sheets, modals) are GPU-promoted using `will-change` and CSS composite properties (`translate3d`) to trigger hardware acceleration.
3. **Off-Thread Computing:** Heavy algorithms (such as Chess Minimax evaluation or thermodynamic indices) must be executed off-thread using dedicated Web Workers or isolated macro-task timeouts to keep the main thread fluid at 120 FPS.
4. **Content Visibility:** Long scrollable lists (poetry, feed, travel atlas) must implement `content-visibility: auto` paired with `contain-intrinsic-size` to reduce DOM rendering load.

---

## 🤖 7. Contract for Future AI Models & Co-Authors
When implementing new features or making updates:
1. **Zero Shortcuts:** Do NOT use placeholders (`// TODO`, `// keep existing code`). Write out every file, hook, schema, and utility in full with exhaustive depth and precision.
2. **Verification Protocol:** After applying any change, you **must** immediately verify it by running relevant unit tests (`bun run test`) and checking file correctness using read-only tools.
3. **Compliance Budget:** Maintain the strict compliance checks by executing the verification suite (`bun run verify`) before submitting any code changes.

*This blueprint stands as the absolute pillar of structural integrity. Abide by it unconditionally.*
