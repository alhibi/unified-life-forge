# 🏛️ SmartHub: Zen Elite Super-App
### المِحرَابُ الرَّقَمِيُّ النُّخْبَوِيُّ — مَوْسُوعَةُ الرُّقِيِّ وَالفَخَامَةِ الهَادِئَةِ

[![CI Workflow](https://github.com/smarthub/smarthub/actions/workflows/ci.yml/badge.svg)](https://github.com/smarthub/smarthub/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-copper?color=B8492E)](./LICENSE)
[![Design: Quiet Luxury](https://img.shields.io/badge/Design-Quiet%20Luxury%20%2F%20Zen%20Elite-B8492E)](#)
[![Architecture: FSD](https://img.shields.io/badge/Architecture-Feature--Sliced%20Design-0d0d0d)](#)

> **SmartHub** is a highly-sophisticated, state-of-the-art Islamic companion and personal knowledge Super-App. Built strictly under the design philosophy of **"Quiet Luxury / Zen Elite"** (Obsidian Luxury), it prioritizes extreme restraint, pixel-perfect mathematical layouts, tactile interactions, and ultra-high-fidelity offline capabilities. The application features **10 fully decoupled standalone application modules** and **6 Next-Generation System Engines** running on an optimized, zero-warning TypeScript and WebAssembly architectural foundation.

---

## 🎨 Design Philosophy: "Quiet Luxury / Zen Elite"

The Super-App is governed by strict, non-negotiable visual invariants configured to look like a high-end luxury instrument (reminiscent of Leica, Porsche, and bespoke mechanical watch faces).

```
┌────────────────────────────────────────────────────────┐
│                   OBSIDIAN LUXURY LIGHTING             │
│                                                        │
│  Canvas Background: 3.0% - 3.5% Lightness (#080808)    │
│  Card Surfaces:     5.0% - 6.0% Lightness (#0d0d0d)    │
│  Borders/Hairlines: 9.0% - 10.0% Lightness (#181818)   │
│                                                        │
│  Sole Chromatic Accent: Copper / Clay (#B8492E) ───[•] │
└────────────────────────────────────────────────────────┘
```

### 📐 The Mathematical 8px Grid System
All spacing, padding, margins, and gaps must strictly adhere to the base grid units:
- **`4px`** (micro adjustments, status indicators)
- **`8px`** (gaps, inline element padding)
- **`12px`** (compact cards, form elements)
- **`16px`** (standard cards padding, lists)
- **`24px`** (outer margins, dashboard section gaps)
- **`32px` / `48px` / `64px`** (structural offsets and hero divisions)

### 🖋️ Typographic & Font Architecture
- **DEFAULT_DISPLAY_FONT_ID (`Amiri`)**: Elegant, editorial classical Arabic serif layout stack, accompanied by **Cormorant Garamond** for beautifully integrated Latin metrics, brand subtitles, and headers.
- **DEFAULT_BODY_FONT_ID (`IBM Plex Sans Arabic` / `Noto Sans Arabic`)**: High-legibility, ultra-sharp sans-serif stack optimized for lengthy readings and interface controls.
- **Numeric Font Stack (`Montserrat` / `IBM Plex Mono`)**: Active clock tickers, metrics, coordinates, and statistics are displayed in Montserrat with the `tabular-nums` class to completely eradicate visual shifting and layout jumping during high-frequency updates.

---

## 📱 The 10 Standalone Application Modules
SmartHub decouples traditional web-app modules into ten beautifully-crafted standalone experiences, each with dedicated route controls, independent lazy boundaries, optimized back targets, and bespoke semantic headers.

### 1. 📖 القرآن الكريم (The Holy Quran & Tafsir)
- **Core Architecture:** Standardized deep-linking via query parameters synchronizes Surah, Ayah, and Tafsir state directly with the URL.
- **Tafsir Engine:** Fully integrated Arabic Tafsir browser (`Tafsir.tsx`) with instant 300ms debounced search, providing elegant typography, multi-source Tafsir, and custom copy/share sheets.

### 2. 📿 الأذكار والدعاء (Dhikr & Devotional Core)
- **Tactile Feedback:** Uses the custom Web Audio API synthesis engine to generate micro-tactile sound cues (using dynamic gain and frequency oscillators) coupled with the `navigator.vibrate` API for a physical rosary experience.
- **Touch Targets:** Micro-interacts and increment targets expand invisibly (minimum `44x44px` mobile targets) via a pseudo-element expansion pattern (`relative before:absolute before:-inset-2 before:content-['']`).

### 3. 📜 السنة النبوية (The Prophetic Sunnah)
- **Structured Repositories:** Bundles curated databases of timed routines (morning, evening, travel, sleep, prayer) and untimed Prophetic traditions (the Nawawi Forty Hadiths).
- **Off-grid Readiness:** Operates completely offline with zero network latency, pulling from highly-compressed bundled static JSON datasets.

### 4. 📜 ديوان الشعر العربي (Classical Arabic Poetry)
- **Manuscript Theme (مخطوطة):** A night-only classical editorial layout powered by specialized css variables:
  - `--ink-bg: #16130F` (parchment sub-dark background)
  - `--ink-card: #1E1912` (inkwell raised card surfaces)
  - `--wax: #B8492E` (wax-seal avatar backgrounds and active metrics)
- **The Corpus:** Exactly **170 classical poets** distributed across six eras: *Jahili, Mukhadram, Islami, Umawi, Abbasi, and Andalusi*.
- **Interactive Details:** Dotted crease lines simulating folded paper, wax-seal icons, and high-performance Arabic rhyme end-letter highlights using efficient grouping algorithms.

### 5. 🎙️ البودكاست (Podcast & Media Hub)
- **Design Constraint:** Adheres strictly to the Zen Elite system with solid `hsl(var(--card))` card structures. It strictly rejects distracting "frosted glass" or heavy backdrop filters.
- **The Player:** Highly responsive bottom-drawer sheet interface (`PlayerSheet`) and modular `PodcastMiniPlayer` synchronizing audio playback state with passive service worker listening.

### 6. 🔖 القراءة المتكاملة (Advanced Reading & Article Extraction)
- **Tactile Cylindrical Sliders:** Features custom vertical sliders for text size, weight, and screen brightness, matching the styling of physical controls.
- **Acoustic Highlight:** Synchronizes browser-native Text-to-Speech voices with visually highlighted active paragraphs in real-time.
- **Technical Capabilities:** Offline article compilation, screen wake-lock preservation, and defensive DOMPurify sanitization.

### 7. 📝 يومياتي (My Journal)
- **Decoupled Privacy:** A private, secure journaling space using local client storage, automatic draft preservation, and encrypted synchronization boundaries with the backend database.
- **Editorial Timelines:** Features timeline visualization with custom mood and thematic tags styled in muted copper tones.

### 8. 📂 أرشيف المعرفة (The Knowledge Archive)
- **Parallel Subsection Generation:** Utilizing premium models (DeepSeek-R1, o1, o1-mini, o3-mini, Llama-3.3-70b, Qwen-2.5-72b), the Supabase Edge Function parallelizes AI subsection rendering in strict batches of six, reducing compilation depth wait times from 20 minutes to less than 2.5 minutes while elegantly handling failures with placeholder warnings.

### 9. 🧠 الذاكرة الرقمية (PKM & Digital Memory Note-taking)
- **Real-Time URL Syncing:** Notes, active ID, status filters, tags, and search queries are synchronized instantly with browser URL parameters.
- **Flicker-Free Search:** Incorporates a high-performance 300ms debounce on all user inputs to eliminate visual grid reflows.

### 10. 🗺️ أطلس السفر (The Travel Atlas & Fitness Tracker)
- **Visual Mapping:** Leaflet OpenStreetMap widgets utilizing custom-designed SVG start/end nodes, auto-bounding fit views, and adaptive dark-mode map tile filters.
- **Douglas-Peucker Route Simplifier:** Downsamples extensive geographical track points to a maximum of 100 coordinates using a binary search on epsilon before database commit, minimizing payload storage.
- **Precision Tracker (Leica Style):** Features a moss-green primary accent (`--fitness-primary`, HSL Hue 100), stacked Recharts area charts, step-trends, and a GPS noise filter rejecting static drift (< 1m motion) or speed anomalies (> 15 m/s).

---

## ⚡ Next-Gen System Engines

SmartHub is orchestrating six underlying high-performance system engines seamlessly registered inside `src/contexts/SystemEngineContext.tsx`:

```
┌──────────────────────────────────────────────────────────────┐
│                  SYSTEM ENGINE ORCHESTRATION                 │
│                                                              │
│  [1] Command Palette  ◄──►  [2] Hardware & Environmental     │
│  [3] Predictive Prefetch  ◄►  [4] State History (Undo/Redo)   │
│  [5] Split-Pane Layout ◄──► [6] Silent Biometric Passkeys    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

1. **Global Command Palette (`cmdk`):** Accessible globally via `Ctrl+K` or `Cmd+K`. Fully indexing application routes, deep page sections, active tools, and settings.
2. **Hardware & Environmental Engine:** Monitors device performance parameters (`navigator.connection`, `navigator.getBattery`). On low power or slow connection, it activates battery-saver modes, capping Framer Motion and spring animation frame rates and disabling heavy background particles.
3. **Intent-Based Predictive Prefetching (`usePredictivePrefetch`):** Observes pointer velocity, hover coordinates, and trajectory vectors to warm-up and prefetch lazy chunk bundles before the user commits to a click.
4. **Universal State History Engine:** Bound globally to `Cmd+Z` / `Cmd+Shift+Z` to trace, commit, and undo/redo complex nested states across note-taking (PKM), journaling, and configuration grids.
5. **Split-Pane Layout Engine (`react-resizable-panels`):** Renders responsive, multi-view side-by-side interfaces on desktop. It automatically flags nested frames (`is_split_pane=true`) to suppress redundant headers, navigation sidebars, and duplicate menus inside sub-iframes.
6. **Silent Biometric Passkey Engine:** Native WebAuthn integration supporting secure passwordless lock/unlock transitions. Includes high-fidelity secure PIN overlays for fallback verification.

---

## 🛠️ The Under-The-Hood Tech Stack

SmartHub leverages a highly responsive, modern engineering stack calibrated for high-density computations:

- **Build Systems & Environment:** [Bun 1.2](https://bun.sh) with Vite 8 + SWC compiling TypeScript 5 in strict-mode, delivering rapid development HMR and clean minification pipelines.
- **State Management:** Fully-typed [Zustand](https://github.com/pmndrs/zustand) stores (Auth, Fitness, System) equipped with partial persistence, rollback transactional execution models, and session capping (max 10 active concurrent caches to prevent storage exhaustion).
- **Asynchronous Data Queries:** [TanStack Query v5](https://tanstack.com/query) for caching, optimistic UI updates, and intelligent refetch thresholds.
- **Thermodynamic Engine (WebAssembly):** Loads, compiles, and runs heavy thermodynamic computations (such as Thom's discomfort indexes) via a custom WebAssembly helper hook (`useAssemblyScript.ts`) utilizing ES2024 `Promise.withResolvers` with elegant mathematical JS fallbacks.
- **XSS & Security Hardening:** Search query results and chat search highlights parse plain-text segments safely into pure React `<span>` and `<mark>` nodes without resorting to `dangerouslySetInnerHTML`. Custom sanitizers defensively strip attribute injections (e.g., `<mark onclick="...">`).
- **Telemetry:** In-memory buffer capped at 100 entries scrubs database URLs, Sentry tokens, JWTs, and stack traces inside `ErrorBoundary.tsx` prior to shipping logs.

---

## 📦 Scripts Reference

Manage the Super-App codebase with the following specialized commands:

| Command | Action |
| :--- | :--- |
| `bun install` | Resolves and installs dependencies using the unified `bun.lock` lockfile. |
| `bun run dev` | Spins up the high-performance Vite local development server on port `8080`. |
| `bun run build` | Compiles the production application bundle into the `dist/` directory. |
| `NODE_OPTIONS="--max-old-space-size=4096" bun run build` | Build override allocating additional node heap memory to prevent Out of Memory errors. |
| `bun run lint` | Audits the codebase for syntax or stylistic anomalies. Expects **0 errors**. |
| `bun run lint:budget` | Verifies warn counts against frozen limits in `lint-budget.json` to prevent debt growth. |
| `bun run test` | Executes unit tests via the Vitest engine. |
| `bun run e2e` | Runs Playwright end-to-end user flows in simulated environments (desktop & Pixel 7). |
| `bun run verify` | Combines TypeScript typecheck, lint audits, and unit tests to ensure absolute stability. |

---

## 🚀 Quickstart for Developers

Follow these steps to get your environment up and running in less than two minutes:

```bash
# 1. Clone the repository and navigate to its root directory
git clone https://github.com/smarthub/smarthub.git
cd smarthub

# 2. Install dependencies with the Bun package manager
bun install

# 3. Establish environmental configurations
cp .env.example .env

# 4. Fire up the local Vite development server
bun run dev
```

*Note: SmartHub is designed with exceptional fallback behaviors. If Supabase configuration variables are not declared in your `.env` file, the application seamlessly activates local-offline mode. Prayer times, localized search, poetry engines, and games remain fully operational.*

---

## 🏛️ Contributing and Code Guidelines

To maintain the extreme precision and stability of the Super-App, contributors must adhere to the following architectural agreements:

1. **Adhere to Feature-Sliced Design (FSD):** Features must reside entirely inside their respective `src/features/<feature_name>` directory. Cross-feature imports must target public endpoints or shared primitives inside `src/components/ui/app-shell.tsx`.
2. **No Direct Supabase Imports in Components:** Never import the Supabase client directly within a visual React component. Move all transactional queries, calls, or subscriptions inside `api.ts` inside the feature boundary.
3. **No Placeholders:** We write fully completed, production-ready, highly typed code. Avoid placeholders (`// TODO`, `// keep existing code`). Implement deep-dives and edge cases directly.
4. **Local Verification:** Always run `bun run verify` and verify that unit and visual alignment guidelines are fully met before pushing changes.

---

## ⚖️ License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
<sub align="right">محراب الرقي — ٢٠٢٥ م</sub>
