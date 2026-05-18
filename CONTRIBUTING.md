# Contributing to unified-life-forge

Thanks for taking the time to contribute! This guide covers the conventions we follow so
PRs land smoothly.

## Code of Conduct

Be respectful, assume good intent, prefer technical disagreement over personal critique. If
something feels off, open an issue privately with a maintainer.

## Getting Started

1. **Fork** the repository and clone your fork.
2. Make sure you're on Node ≥ 20 (see [`.nvmrc`](./.nvmrc)) and npm ≥ 10.
3. Install dependencies and copy the env template:
   ```bash
   npm ci
   cp .env.example .env       # fill in your Supabase project values
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
5. Run the full local CI gate before pushing:
   ```bash
   npm run ci
   ```

## Branch Naming

We use a short, hyphenated prefix that mirrors the Conventional Commit type:

| Prefix       | Use for                                              |
| ------------ | ---------------------------------------------------- |
| `feat/...`   | A new user-facing capability                         |
| `fix/...`    | A bug fix                                            |
| `chore/...`  | Tooling, deps, repo hygiene                          |
| `refactor/...` | Behaviour-preserving code restructure              |
| `docs/...`   | Documentation only                                   |
| `perf/...`   | Performance improvement                              |
| `test/...`   | Tests only                                           |
| `ci/...`     | CI / release pipeline changes                        |

Example: `feat/wellness-goals-streak`, `fix/chat-voice-stuck-on-ios`.

Never push directly to `main`. Always open a PR.

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). The repo
already follows this style — examples from the actual history:

```
feat(reading): add OPML import dialog
fix(chat): resume paused voice message instead of restarting
chore(structure): reorganize for industry-standard layout
refactor(prayer): extract astronomy helpers into utils/prayerAstronomy
docs(readme): document persistent-tabs architecture
```

Format: `type(scope): subject`. Subject is imperative ("add", not "added"), no trailing
period, ≤ 72 chars. The body is optional but encouraged for the *why*.

## Code Style

- **Prettier** owns formatting (`.prettierrc.json`). Run `npm run format` before pushing
  or rely on the pre-commit hook (`lint-staged` runs Prettier + ESLint on staged files
  automatically).
- **ESLint** owns lint rules (`eslint.config.js`, flat config). `eslint-config-prettier`
  is wired in last so the two never fight on style.
- **TypeScript** is strict. New code must typecheck (`npm run typecheck`).
- **Imports**: prefer the `@/` alias for anything inside `src/` (`@/lib/utils`,
  `@/components/ui/button`). Group order: built-ins → third-party → internal, with one
  blank line between groups.
- **Components**: PascalCase file names for React components (`MyThing.tsx`); kebab-case
  is reserved for shadcn-generated files (`use-mobile.tsx`, `use-toast.ts`) so the
  shadcn CLI keeps working.
- **Tailwind**: composite class strings should pass through `cn()` from `@/lib/utils`.
- **No commented-out dead code**. If you need to keep an idea around, use a TODO with
  context or open an issue.

## Tests

- **Unit / component**: Vitest + Testing Library, files end in `*.test.ts`/`*.test.tsx`,
  the setup file is `src/test/setup.ts`.
- **End-to-end**: Playwright (`npm run test:e2e`).

For new features, add at least one test. For bug fixes, add a regression test that fails
without your fix.

## Pull Requests

Before opening a PR, please verify:

- [ ] Branch name follows the convention above.
- [ ] Commits use Conventional Commits.
- [ ] `npm run ci` passes locally.
- [ ] Documentation (README, in-code comments) is updated when behaviour changes.
- [ ] Sensitive values (API keys, tokens) are not committed.
- [ ] An entry was added to `CHANGELOG.md` under `[Unreleased]` if the change is
      user-visible.

The CI workflow runs lint, typecheck, format check, tests, and build on every push and
PR — broken pipelines block merge.

## Reporting Bugs

Open an issue using the bug template at
[`.github/ISSUE_TEMPLATE/bug_report.md`](./.github/ISSUE_TEMPLATE/bug_report.md). Include
reproduction steps, expected vs. actual behaviour, browser / OS, and relevant console
output.

## Suggesting Features

Use [`.github/ISSUE_TEMPLATE/feature_request.md`](./.github/ISSUE_TEMPLATE/feature_request.md).
Describe the user need first, the proposed solution second; alternatives considered are
welcome.

## License

By contributing you agree that your contribution will be licensed under the project's
[MIT License](./LICENSE).
