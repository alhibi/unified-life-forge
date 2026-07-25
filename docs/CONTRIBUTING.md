# Contributing to SmartHub (amv.life)

This is the single source of truth for anyone — human or AI agent (Claude,
GPT, Jules, Lovable) — who edits this codebase. Read it before you touch
a file. Follow it exactly. It exists so that many hands can work on the
project in parallel without breaking each other's work.

> **Golden rule.** Small, isolated, reversible changes. Never edit
> "everything a little" in one pass. If your change touches more than one
> feature, split it into per-feature commits.

---

## 1. Repository shape

```text
src/
  features/<feature>/         Everything owned by one feature (see §2)
    pages/                    Route components. Thin shells.
    components/               Feature-only UI.
    hooks/                    React Query hooks + small stateful helpers.
    lib/ | utils/             Pure helpers used only by this feature.
    data/                     Static datasets (poems, hadiths, foods, …).
    api.ts                    ALL Supabase calls for this feature.
    types.ts                  Domain types.
    queryKeys.ts              Typed React Query key factory.
    index.ts                  Public barrel — the ONLY import surface.

  components/                 App chrome only (BackButton, PageTransition,
                              ScrollToTop, ErrorBoundary, SEO, PageHeader,
                              CommandPalette). The bottom nav was retired in
                              favour of the Portal launcher.
  components/ui/              shadcn primitives + app-shell.tsx.
  contexts/                   App-wide providers only (theme, i18n).
  hooks/                      Truly shared hooks (useAuth, useDeviceLocation…).
  lib/                        Cross-feature pure utilities.
  integrations/supabase/      AUTO-GENERATED — do not edit.
  pages/                      Legacy routes being migrated into features/.

docs/
  architecture/               Long-lived docs (feature-map, data-layer, …).
  tmp/                        Short-lived briefs handed to other agents.

supabase/functions/<name>/    Edge Functions (Deno). One folder per fn.
```

See `docs/architecture/feature-structure.md` for the canonical layout and
`docs/architecture/feature-map.md` for the current migration status of
every feature.

---

## 2. Feature isolation (non-negotiable)

1. **No Supabase outside `features/<x>/api.ts`.** Pages, components and
   hooks call `featureApi.xyz()`. The `supabase` client is imported by
   `api.ts` alone.
2. **No cross-feature imports.** `features/a/*` MUST NOT import from
   `features/b/*`. Lift shared code to `src/lib/` (pure) or
   `src/components/ui/` (primitives).
3. **Public surface = `index.ts`.** External code imports from
   `@/features/<feature>` — never from a deep path.
4. **Pages are thin.** Compose components, call hooks. Business logic
   lives in `hooks/` or `api.ts`.
5. **Tests are colocated.** `foo.test.ts` next to `foo.ts`.

If a change would break rule 1 or 2, **stop** and lift the shared code
first in a separate commit.

---

## 3. Design system

- All color / gradient / shadow values are semantic tokens defined in
  `src/index.css` and themed through shadcn variants.
- **Never hardcode** `text-white`, `bg-black`, `bg-[#...]` in a component.
  Use tokens (`bg-background`, `text-foreground`, `bg-live`, …).
- Motion tokens live in `src/lib/motion.ts`. Do not invent new easings.
- Surface depth: use the `.surface-depth` / `.surface-depth-pressable`
  utilities for the Obsidian dark theme.
- Press feedback: scale(0.96), 120ms spring.
- Minimum input font size: **16px** (iOS zoom prevention).
- No emoji as UI icons. Use the Phosphor barrel `src/lib/icons.tsx`. Import
  from `@/lib/icons` only — never from `@phosphor-icons/react` directly, or
  the build-time weight pruning in `build/phosphorPruneWeights.ts` is bypassed.

### Product identity

- The app is **SmartHub** / **amv.life**. Never mention "Lovable",
  "Supabase", "AI", "GPT", or model names in user-facing copy. Say
  "cloud", "backend", "database".
- No social login, no sharing features, no anonymous sign-up.
- The UI is **Arabic-only (RTL)**. German was removed; do not reintroduce
  `de.json` strings. Use Western digits (123) in Arabic. Keep layout code
  written against logical properties (`ms-`/`me-`, `start`/`end`) so a future
  LTR locale is a config change rather than a rewrite.

---

## 4. Data layer

### Client
- React Query is the single cache. Every server read goes through a hook
  in `features/<x>/hooks/` that uses a key from `queryKeys.ts`.
- Mutations must invalidate the exact keys they touched. No
  `invalidateQueries()` without a key.
- Loading, empty, and error states are **required** — never render a
  blank screen while data is in flight.

### Server
- Every `CREATE TABLE public.<x>` migration MUST include, in order:
  1. `CREATE TABLE ...`
  2. `GRANT` to `authenticated` (+ `anon` only if a policy allows it,
     + `service_role` always).
  3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
  4. `CREATE POLICY ...`.
- User roles live in a separate `user_roles` table with a
  `has_role(uuid, app_role)` SECURITY DEFINER function. Never on
  `profiles`.
- Time-dependent rules (`expire_at > now()`) go in triggers, not CHECK
  constraints.
- No `ALTER DATABASE ...` in migrations.

### Edge Functions
- Live under `supabase/functions/<name>/index.ts` (Deno).
- Use `npm:` imports. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the
  client. AI calls go through the Lovable AI Gateway; secrets stay
  server-side.
- Every function returns JSON with a stable shape:
  `{ ok: true, data }` on success, `{ ok: false, error }` on failure.

---

## 5. TypeScript & code style

- `strict: true` is on. No `any` in new code. Use `unknown` + narrowing.
- Prefer `type` for unions/aliases, `interface` for public objects.
- Named exports only, except for route components (default export so
  they can be lazy-loaded).
- File names: `kebab-case.ts` for utils, `PascalCase.tsx` for components.
- One React component per file.
- No barrel re-exports of implementation details — only the feature's
  `index.ts` re-exports.
- Every function that can fail returns a discriminated result or throws
  a typed error from `features/<x>/errors.ts` — never a bare `Error`.

### Imports

Order: (1) node/npm, (2) `@/lib` & `@/components/ui`, (3) `@/features/<x>`,
(4) relative. Enforced by ESLint.

---

## 6. Accessibility & SEO

- Semantic HTML. One `<h1>` per page. `aria-label` on icon-only buttons.
- Every route has a `<SEO>` component with a real title (<60 chars),
  description (<160 chars), and canonical URL.
- Contrast ratio ≥ 4.5:1. Test both light and dark themes.
- `prefers-reduced-motion` disables non-essential animation
  automatically via `bootMotion()`.

---

## 7. Performance budget

- Route JS on first paint ≤ 200 KB gzipped. Split with `lazy()`.
- No synchronous work > 50 ms on the main thread inside a component.
- Lists longer than ~50 rows use a virtualiser
  (`VirtualMessageList`, `ArticleListGrouped`, …).
- Images: intrinsic `width`/`height`, `loading="lazy"`, `decoding="async"`.
- Never poll faster than 30 s. Prefer Realtime channels for chat/presence.

---

## 8. Workflow for any change

1. **Read** `docs/architecture/feature-map.md` — find the feature you'll
   touch and its status.
2. **Read** the feature's `index.ts`, `api.ts`, and `types.ts` before
   editing anything.
3. **Plan** the smallest possible diff. If it spans features, split it.
4. **Edit** using search-and-replace, not full-file rewrites.
5. **Verify**: `bun run verify` passes, build passes, preview renders the
   changed route, no new console errors, no new network 4xx/5xx. Add
   `bun run e2e` when the change is user-visible.
6. **Update docs**: if you added a route, a table, or a feature, update
   `feature-map.md` and (if relevant) `information-architecture.md`.
7. **Migration**: if you added a table, the migration file must include
   GRANT + RLS + POLICY in the same file.

---

## 9. Definition of Done

A change is done when **all** of the following are true:

- [ ] Build passes (`bun run build`) with zero new warnings.
- [ ] `bun run verify` passes (`typecheck` + `lint` + `lint:budget` + `test`)
      with zero new errors, and `lint:budget` reports no rule above budget.
      This is exactly what the `verify` job in `.github/workflows/ci.yml` runs.
- [ ] `bun run e2e` passes if you touched routing, prayer times, the chat
      surface, the PWA manifest or the service worker. Specs live in `e2e/`.
- [ ] Existing tests still pass; new logic has a colocated test.
- [ ] The affected route renders without console errors in preview. The E2E
      fixture enforces this automatically for every route it visits.
- [ ] Loading / empty / error states are all reachable.
- [ ] Arabic (RTL) renders correctly at 320 px and at desktop width.
- [ ] Light theme AND dark theme both pass contrast.
- [ ] No hardcoded colors, no cross-feature imports, no Supabase call
      outside `api.ts`.
- [ ] `feature-map.md` is updated if status changed.

---

## 10. Forbidden (never do these)

- Edit `src/integrations/supabase/client.ts` or `types.ts`.
- Edit `supabase/config.toml` project-level settings.
- Reference `supabase.com/dashboard` in user-facing copy or docs.
- Store roles on `profiles`.
- Use `localStorage` / `sessionStorage` for anything security-related.
- Add a new top-level folder under `src/`. Extend `features/` instead.
- Introduce a new state library (Redux, Zustand, Jotai). We have
  React Query + React context — that's the ceiling.
- Add a new UI kit. shadcn is the only UI kit.
- Add packages without a real justification. Prefer a 20-line util.
- Rewrite a working file to "clean it up" without a behavior change
  request from the user.

---

## 11. Handing work to another agent

When you write a brief in `docs/tmp/` for another agent (Claude, GPT,
Jules), include:

1. **Scope** — exact files/features it may touch.
2. **Non-goals** — what it must NOT change.
3. **Contracts** — the types and API shapes it must preserve.
4. **Acceptance criteria** — matches §9 above.
5. **Cleanup** — instruct the agent to delete the brief when done.

A brief that doesn't list non-goals will produce a sprawling diff.
Always list them.

---

## 12. Where to look when you're lost

| Question | File |
|---|---|
| Where does feature X live? | `docs/architecture/feature-map.md` |
| How do I structure a new feature? | `docs/architecture/feature-structure.md` |
| How do I call the DB? | `docs/architecture/data-layer.md` |
| What UI primitives exist? | `docs/architecture/ui-primitives.md` |
| How does navigation work? | `docs/architecture/information-architecture.md` |
| Why is a tab kept mounted? | `docs/architecture/persistent-tabs.md` |
| Diwan internals | `docs/architecture/diwan-library.md` |

If the answer isn't in a doc, add it there in the same PR.