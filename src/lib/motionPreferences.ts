/**
 * Motion platform preferences — the versioned, portable half of
 * "الحركة والأداء".
 *
 * The four original knobs (speed, amplitude, bounce, fps cap) keep their own
 * `app-*` localStorage keys because they predate this module and are already
 * mirrored to the cloud one field at a time. Everything the platform gained
 * afterwards lives here, in ONE sanitized, versioned document, exactly like
 * `appearancePreferences.ts` does for the interface platform:
 *
 *   • navStyle           — how a screen enters and leaves
 *   • easingProfile      — the curve family used by the whole app
 *   • scrollProfile      — how scrolling behaves and how hard we protect it
 *   • overlayStyle       — how sheets, menus and dialogs appear
 *   • navDuration        — a multiplier that touches ONLY screen transitions
 *   • listStagger        — cadence of list/section entrance staggering
 *   • pressFeedback      — depth of the tap response
 *   • reduceMotion       — an in-app switch, independent of the OS one
 *   • gestureBack        — edge-swipe- on/off plus its sensitivity
 *   • adaptivePerformance— let the app degrade motion when frames are dropped
 *   • compositorHints    — GPU layer promotion for animated surfaces
 *
 * Every field is sanitized on read so a corrupt or hand-edited value can never
 * put the app into a state the UI cannot represent.
 */

export const MOTION_SCHEMA_VERSION = 1 as const;
export const MOTION_PREFERENCES_STORAGE_KEY = 'app-motion-preferences-v1';

/* ─────────────────────────────────────────────────────────────────────
 * Unions
 * ───────────────────────────────────────────────────────────────────── */

/**
 * How a route change animates.
 *
 *   silk    — pure cross-fade, no transform, no delay. The calmest option and
 *             the one that cannot ever look like it stutters, because there is
 *             no geometry to interpolate.
 *   depth   — the Material-3-expressive scale + fade (the previous default).
 *   slide   — horizontal push/pop with a parallax tail (iOS navigation).
 *   instant — no animation at all. Fastest possible perceived navigation.
 */
export type NavTransitionStyle = 'silk' | 'depth' | 'slide' | 'instant';
export const NAV_TRANSITION_STYLES: readonly NavTransitionStyle[] = [
  'silk',
  'depth',
  'slide',
  'instant',
];

/**
 * The curve family every transition in the app reads.
 *
 *   silk       — decelerating curves with ZERO overshoot anywhere.
 *   standard   — Material 3 emphasized / decelerate / accelerate.
 *   expressive — expo curves plus a real spring on interaction.
 */
export type EasingProfile = 'silk' | 'standard' | 'expressive';
export const EASING_PROFILES: readonly EasingProfile[] = ['silk', 'standard', 'expressive'];

/**
 * Scroll behaviour and how aggressively we defend the scroll frame budget.
 *
 *   silk   — native momentum + the scroll governor (hover work, colour
 *            transitions and hit-testing are suspended while the finger is
 *            flinging, which is what makes long lists feel frictionless).
 *   native — the browser's untouched behaviour.
 *   smooth — additionally opts the document into `scroll-behavior: smooth`
 *            for anchor jumps and programmatic scrolls.
 */
export type ScrollProfile = 'silk' | 'native' | 'smooth';
export const SCROLL_PROFILES: readonly ScrollProfile[] = ['silk', 'native', 'smooth'];

/**
 * How transient surfaces (dialog, menu, popover, select, tooltip) appear.
 *
 *   fade  — opacity only. Nothing pops, nothing springs.
 *   lift  — opacity plus a short 6px rise.
 *   scale — opacity plus the classic 95% zoom.
 *
 * Bottom sheets and drawers always slide from their edge; that is what makes
 * them readable as sheets, so this setting never flattens them.
 */
export type OverlayStyle = 'fade' | 'lift' | 'scale';
export const OVERLAY_STYLES: readonly OverlayStyle[] = ['fade', 'lift', 'scale'];

/* ─────────────────────────────────────────────────────────────────────
 * Bounds
 * ───────────────────────────────────────────────────────────────────── */

export const MIN_NAV_DURATION = 0.4;
export const MAX_NAV_DURATION = 2;
export const MIN_LIST_STAGGER = 0;
export const MAX_LIST_STAGGER = 2.5;
export const MIN_PRESS_FEEDBACK = 0;
export const MAX_PRESS_FEEDBACK = 1.6;
export const MIN_GESTURE_SENSITIVITY = 0.5;
export const MAX_GESTURE_SENSITIVITY = 1.8;

/* ─────────────────────────────────────────────────────────────────────
 * Shape
 * ───────────────────────────────────────────────────────────────────── */

export interface MotionPreferences {
  navStyle: NavTransitionStyle;
  easingProfile: EasingProfile;
  scrollProfile: ScrollProfile;
  overlayStyle: OverlayStyle;
  /** Multiplier applied to screen-transition durations only. */
  navDuration: number;
  /** Multiplier on the per-child stagger delay of page entrances. */
  listStagger: number;
  /** Depth of the press response. 0 disables it entirely. */
  pressFeedback: number;
  /** In-app reduced motion. ORs with the OS preference, never overrides it. */
  reduceMotion: boolean;
  /** Edge-swipe- gesture. */
  gestureBack: boolean;
  /** How little travel commits the swipe. Higher = more sensitive. */
  gestureSensitivity: number;
  /** Let the runtime drop to a saver profile when frames are being missed. */
  adaptivePerformance: boolean;
  /** Promote animated surfaces to their own GPU layer. */
  compositorHints: boolean;
}

export interface MotionProfileDocument extends MotionPreferences {
  schemaVersion: typeof MOTION_SCHEMA_VERSION;
}

/**
 * Defaults are the "silk" answer to the brief: a delay-free cross-fade between
 * screens, overshoot-free curves everywhere, protected scrolling, and overlays
 * that fade rather than pop.
 */
export const DEFAULT_MOTION_PREFERENCES: Readonly<MotionPreferences> = {
  navStyle: 'silk',
  easingProfile: 'silk',
  scrollProfile: 'silk',
  overlayStyle: 'fade',
  navDuration: 1,
  listStagger: 1,
  pressFeedback: 1,
  reduceMotion: false,
  gestureBack: true,
  gestureSensitivity: 1,
  adaptivePerformance: true,
  compositorHints: true,
};

export const DEFAULT_MOTION_PROFILE: Readonly<MotionProfileDocument> = {
  schemaVersion: MOTION_SCHEMA_VERSION,
  ...DEFAULT_MOTION_PREFERENCES,
};

/* ─────────────────────────────────────────────────────────────────────
 * Named presets — complete motion characters, not single knobs.
 *
 * These cover speed / amplitude / bounce too, because a "character" that only
 * changed the easing would not actually feel different. `applyMotionPreset` in
 * AppContext writes both halves.
 * ───────────────────────────────────────────────────────────────────── */

export interface MotionPresetValues extends MotionPreferences {
  /** Global duration multiplier (`app-motion-speed`). */
  speed: number;
  /** Travel distance multiplier (`app-motion-amplitude`). */
  amplitude: number;
  /** Spring overshoot (`app-spring-bounce`). */
  bounce: number;
}

export interface MotionPreset {
  id: string;
  label: string;
  note: string;
  values: MotionPresetValues;
}

export const MOTION_PRESETS: readonly MotionPreset[] = [
  {
    id: 'silk',
    label: 'حرير',
    note: 'تلاشٍ فوري بلا ارتداد — التوقيع الافتراضي',
    values: {
      ...DEFAULT_MOTION_PREFERENCES,
      speed: 1,
      amplitude: 1,
      bounce: 0,
    },
  },
  {
    id: 'instant',
    label: 'فوري',
    note: 'أسرع استجابة ممكنة، حركة شبه معدومة',
    values: {
      ...DEFAULT_MOTION_PREFERENCES,
      navStyle: 'instant',
      navDuration: 0.5,
      listStagger: 0,
      pressFeedback: 0.6,
      speed: 1.5,
      amplitude: 0.35,
      bounce: 0,
    },
  },
  {
    id: 'depth',
    label: 'عمق',
    note: 'تكبير وتلاشٍ بطابع ماتيريال ٣',
    values: {
      ...DEFAULT_MOTION_PREFERENCES,
      navStyle: 'depth',
      easingProfile: 'standard',
      overlayStyle: 'lift',
      speed: 1,
      amplitude: 1,
      bounce: 0,
    },
  },
  {
    id: 'cinematic',
    label: 'سينمائي',
    note: 'انزلاق أفقي وحركة أوسع وأبطأ',
    values: {
      ...DEFAULT_MOTION_PREFERENCES,
      navStyle: 'slide',
      easingProfile: 'expressive',
      overlayStyle: 'scale',
      navDuration: 1.35,
      listStagger: 1.6,
      pressFeedback: 1.3,
      speed: 0.8,
      amplitude: 1.35,
      bounce: 0.35,
    },
  },
  {
    id: 'saver',
    label: 'موفّر',
    note: 'حركة أقل وإطارات أقل للأجهزة الضعيفة أو البطارية المنخفضة',
    values: {
      ...DEFAULT_MOTION_PREFERENCES,
      navStyle: 'instant',
      scrollProfile: 'silk',
      overlayStyle: 'fade',
      navDuration: 0.6,
      listStagger: 0,
      pressFeedback: 0.5,
      compositorHints: false,
      speed: 1.35,
      amplitude: 0,
      bounce: 0,
    },
  },
  {
    id: 'still',
    label: 'سكون',
    note: 'إيقاف الحركة بالكامل مع الحفاظ على وضوح الحالة',
    values: {
      ...DEFAULT_MOTION_PREFERENCES,
      navStyle: 'instant',
      reduceMotion: true,
      navDuration: 0.4,
      listStagger: 0,
      pressFeedback: 0,
      speed: 1.5,
      amplitude: 0,
      bounce: 0,
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────
 * Sanitizing
 * ───────────────────────────────────────────────────────────────────── */

interface StorageReader {
  getItem(key: string): string | null;
}
interface StorageWriter extends StorageReader {
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric * 100) / 100));
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

function sanitizeMember<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export const sanitizeNavStyle = (value: unknown, fallback: NavTransitionStyle = 'silk') =>
  sanitizeMember(value, NAV_TRANSITION_STYLES, fallback);
export const sanitizeEasingProfile = (value: unknown, fallback: EasingProfile = 'silk') =>
  sanitizeMember(value, EASING_PROFILES, fallback);
export const sanitizeScrollProfile = (value: unknown, fallback: ScrollProfile = 'silk') =>
  sanitizeMember(value, SCROLL_PROFILES, fallback);
export const sanitizeOverlayStyle = (value: unknown, fallback: OverlayStyle = 'fade') =>
  sanitizeMember(value, OVERLAY_STYLES, fallback);

export function sanitizeMotionPreferences(
  value: unknown,
  fallback: MotionPreferences = DEFAULT_MOTION_PREFERENCES,
): MotionPreferences {
  const source = isRecord(value) ? value : {};
  return {
    navStyle: sanitizeNavStyle(source.navStyle, fallback.navStyle),
    easingProfile: sanitizeEasingProfile(source.easingProfile, fallback.easingProfile),
    scrollProfile: sanitizeScrollProfile(source.scrollProfile, fallback.scrollProfile),
    overlayStyle: sanitizeOverlayStyle(source.overlayStyle, fallback.overlayStyle),
    navDuration: clampNumber(
      source.navDuration,
      MIN_NAV_DURATION,
      MAX_NAV_DURATION,
      fallback.navDuration,
    ),
    listStagger: clampNumber(
      source.listStagger,
      MIN_LIST_STAGGER,
      MAX_LIST_STAGGER,
      fallback.listStagger,
    ),
    pressFeedback: clampNumber(
      source.pressFeedback,
      MIN_PRESS_FEEDBACK,
      MAX_PRESS_FEEDBACK,
      fallback.pressFeedback,
    ),
    reduceMotion: sanitizeBoolean(source.reduceMotion, fallback.reduceMotion),
    gestureBack: sanitizeBoolean(source.gestureBack, fallback.gestureBack),
    gestureSensitivity: clampNumber(
      source.gestureSensitivity,
      MIN_GESTURE_SENSITIVITY,
      MAX_GESTURE_SENSITIVITY,
      fallback.gestureSensitivity,
    ),
    adaptivePerformance: sanitizeBoolean(source.adaptivePerformance, fallback.adaptivePerformance),
    compositorHints: sanitizeBoolean(source.compositorHints, fallback.compositorHints),
  };
}

export function sanitizeMotionProfile(value: unknown): MotionProfileDocument {
  const source = isRecord(value) && isRecord(value.preferences) ? value.preferences : value;
  return {
    schemaVersion: MOTION_SCHEMA_VERSION,
    ...sanitizeMotionPreferences(source),
  };
}

export function serializeMotionProfile(value: unknown): string {
  return JSON.stringify(sanitizeMotionProfile(value));
}

export function parseMotionProfile(raw: string | null | undefined): MotionProfileDocument | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const envelopeVersion = parsed.schemaVersion;
    const nestedVersion = isRecord(parsed.preferences)
      ? parsed.preferences.schemaVersion
      : undefined;
    if (envelopeVersion !== MOTION_SCHEMA_VERSION && nestedVersion !== MOTION_SCHEMA_VERSION) {
      return null;
    }
    return sanitizeMotionProfile(parsed);
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Storage
 * ───────────────────────────────────────────────────────────────────── */

function defaultStorage(): StorageWriter | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function safelyRead(storage: StorageReader | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function readMotionPreferences(
  storage: StorageWriter | undefined = defaultStorage(),
): MotionProfileDocument {
  return (
    parseMotionProfile(safelyRead(storage, MOTION_PREFERENCES_STORAGE_KEY)) ??
    DEFAULT_MOTION_PROFILE
  );
}

export function writeMotionPreferences(
  value: unknown,
  storage: StorageWriter | undefined = defaultStorage(),
): MotionProfileDocument {
  const profile = sanitizeMotionProfile(value);
  if (storage) {
    try {
      storage.setItem(MOTION_PREFERENCES_STORAGE_KEY, serializeMotionProfile(profile));
    } catch {
      // Storage is an optimization; the sanitized return value stays usable.
    }
  }
  return profile;
}

/** The preset whose complete value set matches the live configuration exactly. */
export function matchMotionPreset(
  preferences: MotionPreferences,
  runtime: { speed: number; amplitude: number; bounce: number },
): string | null {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.03;
  return (
    MOTION_PRESETS.find(({ values }) => {
      if (
        values.navStyle !== preferences.navStyle ||
        values.easingProfile !== preferences.easingProfile ||
        values.scrollProfile !== preferences.scrollProfile ||
        values.overlayStyle !== preferences.overlayStyle ||
        values.reduceMotion !== preferences.reduceMotion ||
        values.gestureBack !== preferences.gestureBack ||
        values.adaptivePerformance !== preferences.adaptivePerformance ||
        values.compositorHints !== preferences.compositorHints
      ) {
        return false;
      }
      return (
        near(values.navDuration, preferences.navDuration) &&
        near(values.listStagger, preferences.listStagger) &&
        near(values.pressFeedback, preferences.pressFeedback) &&
        near(values.gestureSensitivity, preferences.gestureSensitivity) &&
        near(values.speed, runtime.speed) &&
        near(values.amplitude, runtime.amplitude) &&
        near(values.bounce, runtime.bounce)
      );
    })?.id ?? null
  );
}
