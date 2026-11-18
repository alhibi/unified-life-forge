# Super-App Architectural Memory & Agent Guidelines

This file is the engineering contract for every agent working in the amv.life
(`smarthub`) repository. It governs **how** work is done. It is not a visual
authority: the single visual authority is **`DESIGN.md`**, and the short
enforceable UI contract derived from it is `.kiro/steering/design-system.md`.

**Core mandate:** production-grade quality only — reason through edge cases and
second-order effects, never ship placeholder logic as finished, and verify the
result yourself. A claim of "done" needs the command output that proves it.

---

## 0. Before touching UI

1. Read `DESIGN.md` §0 (authority), §3 (semantic tokens), §8 (page grammars),
   §11 (visual exceptions).
2. Read `.kiro/steering/design-system.md` before writing JSX.
3. Read `docs/design-system/component-catalog.md` before creating a component.
4. If the change is a new page or a redesign, read
   `docs/design-system/route-coverage.md` for the route's grammar and states.

Do not invent a local value to imitate a shared token. If a semantic role is
missing, add it to the contract (`src/index.css` / `themeEngine.ts`) with a
test — never a raw hex, px font size, or magic z-index in a component.

---

## 1. Type System & Data Layer

- **No `any` types.** All interfaces and payloads are explicitly and
  exhaustively typed; complex state trees use discriminated unions.
- **Zod validation.** Incoming data (API payloads, user input, database syncs)
  is validated against the schemas in `src/utils/validation/schemas.ts` or the
  domain's own schemas.
- **Network state** uses `NetworkStatus` (`idle`, `loading`, `success`, `error`).

## 2. State Management (Zustand)

- Global state lives in `zustand` stores with explicit action interfaces,
  persistence where required, and `partialize`.
- Never dispatch state (`setState`, `login`, `setTheme`) directly inside a
  render body, or blindly in an effect without a safe guard, to avoid cascading
  renders.
- Respect the JSON storage helpers and purge drafts/caches on logout without
  throwing.

## 3. UI Engineering

- **Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 + Bun. Do not
  replace the stack. There is **no `tailwind.config.ts`**; Tailwind v4 tokens
  live in `src/index.css` (`@theme`, `@utility`, `:root`).
- **Design system:** follow `DESIGN.md`. Compose from `src/components/ui/*` and
  `src/components/PageHeader.tsx`; extend a primitive instead of forking one.
- **Semantic tokens only:** colours, radii, spacing, widths, type steps, motion
  and z-index come from the published roles. No raw hex/rgb/hsl in app chrome,
  no named palette classes (`bg-blue-500`), no `rounded-[Npx]`, no numeric
  `z-*`, no px font sizes.
- **Raw colour is allowed only** in artwork, charts, maps, 3D/canvas and real
  content imagery — and must be registered in `docs/design-system/visual-exceptions.md`.
- **Motion:** all Framer Motion timing reads the shared tokens / `MOTION`
  export. Never hardcode durations. Respect reduced motion.
- **RTL:** logical properties only (`ms/me/ps/pe/start/end/text-start`).
  German/Latin runs are wrapped locally with `dir="ltr"`, never by flipping the
  page.
- **States:** every interactive flow documents A (start) / B (in progress) /
  C (result) per `DESIGN.md` §10. Buttons need hover/focus/pressed/disabled/
  loading/success/error as applicable.

### Visual verification commands

- `bun run audit:routes` — كل مسار في Chromium على 390/1440: تجاوز أفقي، ErrorBoundary، غياب h1، تسريب اتجاه، أهداف لمس، + لقطة 390.
- `bun run audit:contrast` — نسبة تباين النص الفعلية على خلفيته المركّبة في 20 مساراً × وضعين.
- `bun run capture:design` — مصفوفة لقطات قبل/بعد.

## 4. Environment & Dependencies

- **Bun first:** `bun install`, `bun run build`, `bun run test`.
- On Vite build OOM use `NODE_OPTIONS="--max-old-space-size=4096"`.
- **Pre-commit checks:** always run `bun run verify` — the full chain:
  `typecheck && lint && lint:budget && arch && test && build`. CI re-runs the
  same chain. UI changes additionally require `bun run e2e` and a rendered
  screenshot check.
- Do not add dependencies for styling, icons, animation or primitives that the
  repository already covers.

## 5. Architectural Map (Feature-Sliced Design)

- FSD layout under `src/features/<feature>/` (pages, components, hooks, types,
  api). Architecture facts live in `docs/architecture/` — product truth, not
  visual authority.
- Do not import raw Supabase clients outside a feature's designated `api.ts`;
  use context or helper hooks.
- Keep business logic, schemas, API contracts, permissions and auth untouched
  by visual work. A visual migration never rewrites a store or a query.

---

## البوابات وخط الأنابيب (CI/CD)

- **الوظائف الأربع تعاقدية**: `verify` · `npm install parity` · `Enforce bundle budget` · `e2e` — أسماؤها في `.github/workflows/verify.yml` مربوطة حرفياً بـ`renovate.json` (الدمج التلقائي معلّق عليها). لا تُعد تسمية أي وظيفة دون تحديث الملفين معاً.
- **الميزانيتان مجمّدتان وتنزلان فقط**: `lint-budget.json` (عدّ التحذيرات لكل قاعدة) و`bundle-budget.json` (brotli لكل قطعة، بهامش 2% + أرضية 64B). أي زيادة تفشل البوابة: أصلح لا ترفع الرقم؛ وإعادة المعايرة `--write` للانخفاض الموثّق فقط.
- **شبكة الدخان** (كل المسارات): bun run test:smoke = عملية مستقلة لكل مسار (82 شريحة، 4 متوازية، ~3 دقائق). التجمّد التراكمي في jsdom يعني أن تركيب عدة مسارات في عملية واحدة قد لا يستقر؛ العزل لكل مسار هو ما يجعل البوابة حتمية. ليست جزءاً من test العادي.
- **فحص RLS** يستهدف مشروع الإنتاج؛ يفشل بصوت عالٍ عمداً عند تعذّر الوصول (وإلا لكان فحصاً كاذباً). لا يُضبط أي علم تخطٍّ أوفلاين في CI؛ العلم `VITE_ALLOW_OFFLINE_RLS=1` مخصّص للحاويات المحلية بلا شبكة فقط.
- **قاعدة الفحص الذاتي**: قبل أي push شغّل السلسلة كاملة محلياً — الفحص الذي لا يُشغَّل لا يحمي شيئاً.

## Shared visual architecture

- One semantic contract, fourteen theme families: `themeEngine.generateThemeTokens()`
  derives every role from the family's authored colours plus its
  `themeArtDirections` material recipe; components consume the roles, never the
  family id.
- Geometry (width, density, radius, borders, touch, focus) comes from
  `interfaceScale`; motion comes from `src/lib/motion.ts` and its preferences.
- Structural material interpolates opaque tonal surfaces, never
  background-dependent alpha, so a saved material/customisation choice stays
  meaningful and cards never wash out.

_Visual decisions and their rationale: `DESIGN.md`. This file: engineering rules only._
