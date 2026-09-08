import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell configuration.
 *
 * The single hardest thing to get right on a native cold start is the handoff
 * from the OS splash to the first painted web frame. Three settings have to
 * agree or the user sees a flash:
 *
 *   1. `SplashScreen.backgroundColor` — #0D0D0F, the exact `--background` of
 *      the shipped Architectural Copper dark theme (see `src/index.css`).
 *   2. The boot script in `index.html`, which resolves dark unless the user
 *      explicitly stored 'light', and paints the same colour on <html>.
 *   3. `backgroundColor` here, which is what the WebView itself paints in the
 *      gap between the splash hiding and the first frame.
 *
 * `launchAutoHide: false` is deliberate: the splash is dismissed from JS by
 * `hideSplashWhenPainted()` (src/lib/native.ts) after two animation frames, so
 * it can never hide onto a blank view — and never lingers on a timer either.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.p5e00a076b7eb4a24bbacaeff3467597a',
  appName: 'amvlife',
  webDir: 'dist',
  // The WebView's own paint colour during the handoff. Must equal the dark
  // theme background, not white.
  backgroundColor: '#0D0D0F',
  android: {
    // Draw behind the status/navigation bars so `env(safe-area-inset-*)` in
    // our CSS is what positions content — the same model as iOS.
    adjustMarginsForEdgeToEdge: 'disable',
    backgroundColor: '#0D0D0F',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0D0D0F',
  },
  plugins: {
    SplashScreen: {
      // JS owns the dismissal — see the note above.
      launchAutoHide: false,
      backgroundColor: '#0D0D0F',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: false,
      // Only the fade-out is timed; it is short enough to read as a handoff
      // rather than an animation.
      fadeOutDuration: 180,
    },
    StatusBar: {
      // The live colour is written per screen by `syncStatusBar()`; this is
      // only the launch value.
      style: 'DARK',
      backgroundColor: '#0D0D0F',
      overlaysWebView: true,
    },
    Keyboard: {
      // Never let the OS resize the whole document — the app publishes the
      // keyboard height as `--kb-inset` and moves only the composer.
      resize: 'none',
      resizeOnFullScreen: false,
    },
  },
  server: {
    url: 'https://5e00a076-b7eb-4a24-bbac-aeff3467597a.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
