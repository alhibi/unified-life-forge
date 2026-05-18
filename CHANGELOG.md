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

### Fixed

- Seven source files that did not end with a final newline now do
  (`SEO.tsx`, `useFastTap.ts`, `fetchRetry.ts`, `notify.ts`, `registerFontsSw.ts`,
  `reverseGeocode.ts`, `tsconfig.app.json`).

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
