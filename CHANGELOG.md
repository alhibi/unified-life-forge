# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project documentation: full README, CONTRIBUTING guide, MIT LICENSE, this CHANGELOG.
- Editor / formatter configuration: `.editorconfig`, `.prettierrc.json`, `.prettierignore`.
- GitHub Actions CI workflow (`lint`, `typecheck`, `format:check`, `test`, `build`) and
  Pull Request / Issue templates under `.github/`.
- `.nvmrc` pinning Node 20 to match `engines` in `package.json`.
- Husky + `lint-staged` pre-commit hook to run ESLint and Prettier on staged files.
- Vitest scaffolding: real unit test for `lib/utils.cn` and an integration test stub for
  the entry route.
- Coverage tooling via `@vitest/coverage-v8`.
- New scripts: `typecheck`, `lint:fix`, `format`, `format:check`, `test:coverage`,
  `test:e2e`, `ci`, `start`.

### Changed

- Co-locate the chat module: moved `src/components/ChatDrawer.tsx` into
  `src/components/chat/` next to its siblings; rewrote internal relative imports.
- ESLint flat config now extends `eslint-config-prettier` (last in chain) and adds a
  shared `ignores` block (`dist`, `build`, `coverage`, generated Supabase types,
  service workers, SQL migrations).
- Tailwind `content` glob trimmed to `./index.html` and `./src/**/*.{ts,tsx}` —
  removed three globs that pointed at non-existent root directories.
- `package.json`: real name (`unified-life-forge`), `version: 0.1.0`, `license: MIT`,
  `description`, `repository`, `homepage`, `bugs`, `engines`.
- `.env.example` trimmed to the two variables actually consumed at runtime.

### Removed

- `src/App.css` — empty placeholder, not imported anywhere.
- `bun.lockb` — legacy Bun binary lockfile, superseded by the text `bun.lock`.
- Unused npm dependencies (zero source references):
  - `zod` — no schemas exist anywhere.
  - `@hookform/resolvers` — `react-hook-form` is only referenced by the
    unused shadcn `ui/form.tsx` primitive.
  - `@emoji-mart/react` — the chat picker uses the framework-agnostic
    `emoji-mart` API directly (`new Picker()`).
  - `@types/dompurify` — `dompurify@^3.x` ships its own types; the
    separate `@types` package targets v2.

### Fixed

- Seven source files that did not end with a final newline now do
  (`SEO.tsx`, `useFastTap.ts`, `fetchRetry.ts`, `notify.ts`, `registerFontsSw.ts`,
  `reverseGeocode.ts`, `tsconfig.app.json`).

### Notes

- The following shadcn/ui primitives are currently present on disk but
  unused by any feature: `ui/form.tsx`, `ui/chart.tsx`, `ui/command.tsx`,
  `ui/drawer.tsx`, `ui/carousel.tsx`, `ui/resizable.tsx`,
  `ui/input-otp.tsx`. They are intentionally retained because the shadcn
  CLI treats them as a managed set; their underlying npm dependencies
  (`react-hook-form`, `recharts`, `cmdk`, `vaul`, `embla-carousel-react`,
  `react-resizable-panels`, `input-otp`) are kept for the same reason.
  A future PR can prune them as a separate, deliberate decision.
- The following non-UI source files have zero importers as of this audit
  but were retained because the single-commit git history does not let
  us distinguish "abandoned" from "staged for upcoming work" — they may
  be load-bearing exports for the Lovable platform integration or
  upcoming features. A maintainer with domain context should decide:
  `src/components/NavLink.tsx`, `src/components/ReadingDialog.tsx`,
  `src/components/ReligiousOccasions.tsx`, `src/hooks/useFastTap.ts`,
  `src/integrations/lovable/index.ts`, `src/lib/motion.ts`,
  `src/lib/prayerTimes.ts`, `src/utils/audioStorage.ts`,
  `src/utils/hijri.ts`. The new `@typescript-eslint/no-unused-vars`
  warn-level rule will surface unused exports the moment they're
  touched in a PR.
- The following dependencies are deliberately *not* upgraded across a
  major version because each upgrade requires non-trivial code changes
  and is best done in a focused PR with manual QA: `react-day-picker`
  (8.x → 9.x — API rewrite) and `lucide-react` (0.462 → current — minor
  icon name churn). Both are still actively maintained on their current
  major.

## [0.1.0] - 2026-05-18

Initial public version. The application provides:

- Prayer times, hijri/gregorian dual calendar, religious occasions.
- Sunnah libraries (timed and untimed), Prophetic Day routine, Quran virtues, Tafsir.
- Duas, classical Arabic poetry (Diwan).
- Wellness suite: nutrition, supplements, vitals, athletic / recovery / calisthenics
  engines, encyclopedia, insights, goals.
- RSS reader with offline cache, OPML import, keyword alerts, in-app cron.
- 1:1 chat with realtime presence, voice notes, reactions, replies, forwards.
- Sudoku, chess (puzzles + career), memory pairs, dice tournament, focus decathlon.
- 30+ themes, RTL Arabic and German, mobile-first PWA.

[Unreleased]: https://github.com/alhibi/unified-life-forge/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alhibi/unified-life-forge/releases/tag/v0.1.0
