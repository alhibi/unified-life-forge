/**
 * native.ts — the single bridge between the web app and the Capacitor shell.
 *
 * Every plugin is imported *dynamically* and behind a capability check, so:
 *   • the browser build never pays for native-only code,
 *   • a missing plugin degrades to the closest web equivalent
 *     (`navigator.vibrate`, the `theme-color` meta tag) instead of throwing,
 *   • the first tap never waits on a plugin bundle: the CSS pressed state is
 *     already painted by then, and the haptic is fire-and-forget.
 *
 * Nothing here ever awaits on the render path.
 */

export type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string };

function cap(): CapacitorGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True only inside the iOS/Android Capacitor shell. */
export function isNative(): boolean {
  return cap()?.isNativePlatform?.() === true;
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  const p = cap()?.getPlatform?.();
  return p === 'ios' || p === 'android' ? p : 'web';
}

/* ── Haptics ──────────────────────────────────────────────────────── */

const WEB_FALLBACK_MS: Record<HapticKind, number | number[]> = {
  selection: 6,
  light: 8,
  medium: 15,
  heavy: 30,
  success: [12, 40, 18],
  warning: [20, 60, 20],
  error: [30, 60, 30, 60, 30],
};

/**
 * Fire a haptic. Deliberately NOT called on every tap — reserve it for
 * selection changes (tabs, toggles), completed actions and errors.
 */
export function haptics(kind: HapticKind = 'light'): void {
  if (typeof window === 'undefined') return;
  if (!isNative()) {
    try {
      navigator.vibrate?.(WEB_FALLBACK_MS[kind]);
    } catch {
      /* unsupported — silent by design */
    }
    return;
  }
  void import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      switch (kind) {
        case 'selection':
          return Haptics.selectionChanged();
        case 'light':
          return Haptics.impact({ style: ImpactStyle.Light });
        case 'medium':
          return Haptics.impact({ style: ImpactStyle.Medium });
        case 'heavy':
          return Haptics.impact({ style: ImpactStyle.Heavy });
        case 'success':
          return Haptics.notification({ type: NotificationType.Success });
        case 'warning':
          return Haptics.notification({ type: NotificationType.Warning });
        case 'error':
          return Haptics.notification({ type: NotificationType.Error });
      }
    })
    .catch(() => {
      /* plugin absent — nothing to do */
    });
}

/* ── Status bar ───────────────────────────────────────────────────── */

let lastStatusBar = '';

/**
 * Keep the OS status bar in step with the screen behind it.
 *
 * On the web this is the `theme-color` meta tag (which Chrome/Android and
 * installed PWAs honor); natively it is the StatusBar plugin, including
 * `overlaysWebView` so Android draws edge-to-edge and our
 * `env(safe-area-inset-top)` padding is what actually positions content.
 */
export function syncStatusBar(backgroundColor: string, dark: boolean): void {
  if (typeof document === 'undefined') return;
  const signature = `${backgroundColor}|${dark}`;
  if (signature === lastStatusBar) return;
  lastStatusBar = signature;

  // Web / PWA: a single authoritative theme-color tag. The two
  // prefers-color-scheme variants in index.html only cover the boot frame.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-runtime]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.setAttribute('data-runtime', 'true');
    document.head.appendChild(meta);
  }
  meta.content = backgroundColor;

  if (!isNative()) return;
  void import('@capacitor/status-bar')
    .then(async ({ StatusBar, Style }) => {
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      if (nativePlatform() === 'android') {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setBackgroundColor({ color: backgroundColor }).catch(() => undefined);
      }
    })
    .catch(() => undefined);
}

/* ── Splash screen ────────────────────────────────────────────────── */

/**
 * Hide the splash only once the shell has genuinely painted — a fixed timer
 * either flashes white (too early) or stalls (too late).
 */
export function hideSplashWhenPainted(): void {
  if (!isNative()) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void import('@capacitor/splash-screen')
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 180 }))
        .catch(() => undefined);
    });
  });
}

/* ── Keyboard ─────────────────────────────────────────────────────── */

/** Close the soft keyboard (used on navigation, sheet dismiss, submit). */
export function dismissKeyboard(): void {
  if (typeof document !== 'undefined') {
    const el = document.activeElement as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
      el.blur();
    }
  }
  if (!isNative()) return;
  void import('@capacitor/keyboard')
    .then(({ Keyboard }) => Keyboard.hide())
    .catch(() => undefined);
}