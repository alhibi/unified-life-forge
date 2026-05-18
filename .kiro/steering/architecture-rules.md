---
inclusion: always
---

# Architecture rules for unified-life-forge

These are non-obvious, hard-won rules. Violate them and the app misbehaves
in subtle ways.

## Persistent tabs

The 6 bottom-nav tab routes (`/`, `/games`, `/chat`, `/settings`, `/duas`,
`/diwan`, `/wellness`) are eager-imported in `src/App.tsx` and rendered
together inside `<PersistentTabs/>`. Active tab uses `display:block`,
inactive uses `display:none` — never unmount. The matching `<Route>` entries
in `<Routes>` render `element={null}` so React Router doesn't double-mount
them. Idle prefetch warms sub-routes (Theme, Profile, Prayer, Reading)
instead of the tabs.

DO NOT:

- Re-add tab pages to `lazy()` or to active `<Route element=...>`.
- Wrap PersistentTabs slots in `PageTransition` — tab switches must be
  instant (no fade).

## Unread chat count

Use the shared hook `src/hooks/useUnreadCount.ts`. Do NOT inline the
`conversations` -> `messages where read=false` query anywhere else.
Each call site MUST pass a unique `channelName` (e.g. `bottomnav-unread`,
`home-unread`) to avoid Supabase realtime channel collisions.

## Font size and weight

User-controllable `font-size` and `font-weight` are applied on `<body>`,
NOT `<html>`. Setting them on `<html>` re-scales every `rem` token (which
breaks tailwind's 16px = 1rem assumption) and overrides utility classes
like `font-bold`. Family + opacity are CSS variables on `:root`.

## Settings persistence

`AppContext` uses a single coalescing debounce timer (`SAVE_DEBOUNCE_MS =
400ms`) to flush settings to Supabase. Setters call `scheduleSave()`, never
their own `setTimeout(saveToDb, ...)`. `flushSaveToDb` reads from the
`authUserRef` (NOT the `authUser` state) so the closure captured at mount
time stays correct after sign-in.

## Auth username -> email mapping

The app uses `<username>@smartapp.local` as a synthetic email. Usernames
MUST match `^[a-zA-Z0-9_]{3,24}$` — `useAuth` validates this via
`validateUsername()` before calling Supabase. Do not bypass.

## Chat regex utilities

URL detection in `src/components/chat/chatUtils.ts` uses fresh regex
instances per call (`buildUrlSplitRegex()`, `buildUrlTestRegex()`). Do NOT
hoist a `/g` flagged regex to module scope — `lastIndex` leaks between
calls and causes non-deterministic matches.

## Image uploads

`startUpload()` returns `string | null`. `null` means the file was rejected
(too large or disallowed MIME). Callers MUST handle the null branch with a
user-visible toast (see `useChat#sendStagedImages`).

## Console logging

`navPerf.ts` is the only place that uses `console.log` / `console.table`,
and the calls are gated behind `import.meta.env.DEV`. Do not add new
`console.*` to production code paths.
