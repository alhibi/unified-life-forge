# Super-App Architectural Memory & Agent Guidelines

This file serves as the strict operational memory and architectural contract for all AI models (agents) interacting with the amv.life (`smarthub`) repository.

**Core Mandate:**
Hold every task to a flagship/frontier-model bar of quality — not a "good enough" or MVP-shortcut bar. Reason through the full problem, edge cases, and second-order consequences before writing any code. Never ship placeholder, mock, or stubbed logic as if it were finished work. Verify correctness yourself rather than assuming something works because it looks right. Default to production-grade craftsmanship in code, architecture, and UI polish.

---

## 1. Type System & Data Layer
- **No `any` Types:** All TypeScript interfaces and payloads must be explicitly and exhaustively typed. Use Discriminated Unions for complex state trees.
- **Zod Validation:** All incoming data (API payloads, user inputs, database syncs) must be strictly validated against exhaustive Zod schemas found in `src/utils/validation/schemas.ts` or related domain directories.
- **API Models:** Network states must use the defined `NetworkStatus` (`idle`, `loading`, `success`, `error`).

## 2. State Management (Zustand)
- **Stores:** Global application state is managed via `zustand`. Core engines (Auth, System, Fitness) are configured with persistence (`zustand/middleware`), strict action interfaces, and explicit `partialize` methods.
- **State Updates:** Never call state dispatchers (e.g., `setState`, `login`, `setTheme`) directly inside the synchronous render body of a React Component or blindly within an effect without wrapping them safely to prevent React cascading render warnings.
- **Memory Integrity:** Respect the built-in JSON storage methods and ensure local storage purges (like drafts and caches) are properly handled on logout without throwing exceptions.

## 3. UI Primitives & Styling (Zen Elite)
- **Design System:** The app uses a strict "Quiet Luxury / Zen Elite" design system. Hardcoded hex values, inline styles (except for extreme dynamic calculations), and bespoke custom margins/paddings are prohibited.
- **Tailwind:** The repository runs on Tailwind CSS v4. Stick to semantic variables (e.g., `bg-background`, `text-foreground`, `border-border`, `ring-ring`). Use mathematical geometry scales (`var(--r-sm)`, `var(--r-md)`, etc.).
- **Components:** Compose all features using base primitives from `src/components/ui/*`.
- **Animation:** All Framer Motion timing must respect the user's setting via global CSS variables. Never hardcode durations in milliseconds directly into the UI variants.

## 4. Environment & Dependencies
- **Bun First:** Use `bun install`, `bun run build`, and `bun run test`.
- **Node Options:** If memory issues occur during Vite builds, use `NODE_OPTIONS="--max-old-space-size=4096" bun run build`.
- **Pre-commit Checks:** Always verify your work with `bun run verify` — the
  full chain: `typecheck && lint && lint:budget && arch && test && build`.
  A green local run is the entry ticket; CI re-runs the same chain on GitHub.

## 5. Architectural Map (Feature-Sliced Design)
- Adhere strictly to the Feature-Sliced Design (FSD) located in `docs/architecture/`.
- Isolate domain features under `src/features/<feature>/` (pages, components, hooks, types).
- Avoid directly importing raw Supabase clients outside of designated `api.ts` feature endpoints. Use context or helper hooks.

By reading this file, you agree to uphold these standards unconditionally in all generated outputs.

## ميزة مراقبة العملات الرقمية (Crypto Watchlist)

- **الجدول**: `public.crypto_watchlist` (`user_id`, `chain_id`, `pair_address`, `token_symbol`, `label`) — RLS: كل مستخدم يرى ويعدّل صفوفه فقط، مع قيد فريد على `(user_id, chain_id, pair_address)` وقيد CHECK على الشبكات المدعومة.
- **الدالة الطرفية**: `supabase/functions/dexscreener-proxy` — عمليتان: `search` و`batch`، مع تخزين مؤقت (TTL)، قاطع دائرة يعيد بيانات قديمة بعلَم `stale`، تحديد معدّل لكل مستخدم، وتحقّق Zod للمخارج والمداخل. لا مفاتيح على العميل.
- **قائمة الشبكات المعتمدة**: مصدر واحد فقط في `src/features/crypto/types.ts` (`SUPPORTED_CHAINS`) — لا تُكرَّر في أي مكان آخر.
- **الأسعار**: تُنقل كسلاسل نصية من البداية للنهاية (لا تحويل إلى أرقام عائمة) لحفظ دقة العملات الصغيرة، وتُعرض بخطوط `tabular-nums`.

---

## البوابات وخط الأنابيب (CI/CD)

- **الوظائف الأربع تعاقدية**: `verify` · `npm install parity` · `Enforce bundle budget` · `e2e` — أسماؤها في `.github/workflows/verify.yml` مربوطة حرفياً بـ`renovate.json` (الدمج التلقائي معلّق عليها). لا تُعد تسمية أي وظيفة دون تحديث الملفين معاً.
- **الميزانيتان مجمّدتان وتنزلان فقط**: `lint-budget.json` (عدّ التحذيرات لكل قاعدة) و`bundle-budget.json` (brotli لكل قطعة، بهامش 2% + أرضية 64B). أي زيادة تفشل البوابة: أصلح لا ترفع الرقم؛ وإعادة المعايرة `--write` للانخفاض الموثّق فقط.
- **شبكة الدخان** (كل المسارات): تُدار بعمليات منفصلة لكل شريحة عبر `bun run test:smoke`، وليست جزءاً من `bun run test` — بسبب تجمّد متعدد التركيبات في بيئة jsdom موثّق في `vitest.config.ts` وتعليقات السكربت.
- **فحص RLS** يستهدف مشروع الإنتاج؛ يفشل بصوت عالٍ عمداً عند تعذّر الوصول (وإلا لكان فحصاً كاذباً). لا يُضبط أي علم تخطٍّ أوفلاين في CI؛ العلم `VITE_ALLOW_OFFLINE_RLS=1` مخصّص للحاويات المحلية بلا شبكة فقط.
- **قاعدة الفحص الذاتي**: قبل أي push شغّل السلسلة كاملة محلياً — الفحص الذي لا يُشغَّل لا يحمي شيئاً.

<!-- LOVABLE:BEGIN -->
## Shared visual architecture
- Generate theme roles in themeEngine from the complete themeArtDirections registry and geometry in interfaceScale; material recipes own mode-specific surface separation and colour-body weights while shared controls, feature chrome and portaled overlays consume one semantic contract, preserving user theme/mode/strength choices. Structural material softness interpolates opaque elevation tones, never background-dependent alpha, so saved material controls remain meaningful without washing out cards.
<!-- LOVABLE:END -->
- Launcher widget material is authored per app in AppTileVisuals (tone 0 = neutral widget, 1–6 = category bodies) and two-column spans come from widgetSpans; this keeps every realm a gap-free multicolour composition instead of one repeated hue.
