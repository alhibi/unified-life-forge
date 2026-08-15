---
name: Native Shell Integration
description: Capacitor platform layer — haptics, status bar, keyboard, splash, Android back — plus 1:1 edge-swipe-back
type: feature
---
- `src/lib/native.ts` is the ONLY bridge to Capacitor plugins: `haptics()`, `syncStatusBar()`, `hideSplashWhenPainted()`, `dismissKeyboard()`, `isNative()`. Always dynamic-import plugins behind `isNative()` with a web fallback (`navigator.vibrate`, `theme-color` meta).
- `src/components/NativeShell.tsx` (mounted in App inside BrowserRouter): status-bar/theme-color sync per route + theme class, keyboard dismiss on navigation, `--kb-inset` CSS var, splash hide after 2 rAF, Android hardware back pops the router stack (double-press to exit at root). Overlays can opt into back handling with `data-back-intercept`.
- `EdgeSwipeBack` drags the live `[data-page-surface]` element imperatively (transform only), locks axis in the first 10px, resolves by 35% distance OR 0.5px/ms flick, springs back otherwise, and clears `transform`/`will-change` before `navigate(-1)` so PageTransition owns the exit. Opt out with `data-no-swipe-back`.
- Haptics are reserved for selection changes, success and errors — never every tap.
