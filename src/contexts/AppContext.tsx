import type { User } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/hooks/useAuth';
import { type Language, translate } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import {
  type AdvancedInterfacePreferences,
  APPEARANCE_PREFERENCES_STORAGE_KEY,
  DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
  type DividerStyle,
  type InteractionStyle,
  parseAppearanceProfile,
  type RadiusProfile,
  readAppearancePreferences,
  sanitizeAdvancedInterfacePreferences,
  type ScrollbarStyle,
  type SurfaceMaterial,
  writeAppearancePreferences,
} from '@/lib/appearancePreferences';
import {
  clampFontWeight,
  DEFAULT_DISPLAY_FONT_ID,
  DEFAULT_FONT_ID,
  resolveFontId,
  resolveFontSize,
  resolveTypeLeading,
  resolveTypeRatio,
  typographyTokens,
} from '@/lib/fonts';
import {
  applyCssVars,
  clampCornerSoftness,
  DEFAULT_BORDER,
  DEFAULT_CORNER_SOFTNESS,
  DEFAULT_DENSITY,
  DEFAULT_WIDTH,
  interfaceTokens,
  resolveBorder,
  resolveDensity,
  resolveWidth,
} from '@/lib/interfaceScale';
import {
  DEFAULT_MOTION_PREFERENCES,
  type EasingProfile,
  MOTION_PREFERENCES_STORAGE_KEY,
  MOTION_PRESETS,
  type MotionPreferences,
  type NavTransitionStyle,
  type OverlayStyle,
  parseMotionProfile,
  readMotionPreferences,
  sanitizeMotionPreferences,
  type ScrollProfile,
  writeMotionPreferences,
} from '@/lib/motionPreferences';
import {
  applyCompositorHints,
  applyEasingProfile,
  applyListStagger,
  applyMotionAmplitude,
  applyMotionBounce,
  applyMotionSpeed,
  applyNavDuration,
  applyNavStyle,
  applyOverlayStyle,
  applyPressFeedback,
  applyReduceMotion,
  getNativeHz,
  installFpsCap,
  measureDisplayHz,
} from '@/lib/motionRuntime';
import { installPerfGovernor, setFrameBudgetHz } from '@/lib/perfMonitor';
import { applyScrollProfile } from '@/lib/scrollRuntime';
import {
  applyThemeTokens,
  generateThemeTokens,
  type SurfaceLift,
  themePresets,
  type ThemeStyle,
} from '@/utils/themeEngine';

/** Coerce any stored value to a valid surface-lift level. */
const resolveSurfaceLift = (value: string | null | undefined): SurfaceLift =>
  value === 'flat' || value === 'lifted' || value === 'subtle' ? value : 'subtle';
const DEFAULT_SURFACE_LIFT: SurfaceLift = 'subtle';

// 'system' was intentionally removed from the public theme API — users
// pick Light or Dark explicitly. Any stale localStorage value is
// migrated to 'light' on read below.
type Theme = 'light' | 'dark';
type PaletteStyle = 'tonal' | 'vibrant' | 'expressive' | 'neutral' | 'rainbow';
type ColorTheme =
  | 'paper'
  | 'default'
  | 'midnight'
  | 'rose'
  | 'emerald'
  | 'lavender'
  | 'sunset'
  | 'ocean'
  | 'neon'
  | 'coffee'
  | 'mono'
  | 'cherry'
  | 'gold'
  | 'aurora'
  | 'sakura'
  | 'arctic'
  | 'volcano'
  | 'matcha'
  | 'nebula'
  | 'copper'
  | 'mint'
  | 'sandstone'
  | 'dusk'
  | 'moss'
  | 'clay'
  | 'storm'
  | 'silk'
  | 'amber'
  | 'fog'
  | 'obsidian'
  | 'terracotta'
  | 'dynamic';

type PrayerMadhab = 'shafii' | 'hanafi' | 'hanbali' | 'maliki';
type LatitudeAdjMethod = 'middle' | 'seventh' | 'angle';
/** 'auto' = pick per-country; otherwise an explicit Aladhan method id (Sunni-only). */
type CalcMethod = 'auto' | number;
/** rAF throttle cap. 'auto' = native refresh (no throttle). */
export type FpsCap = 'auto' | 60 | 90 | 120;

interface AppContextType {
  /** ── Appearance: palette ── */
  /** How far surfaces separate from the page. See SurfaceLift. */
  surfaceLift: SurfaceLift;
  setSurfaceLift: (v: SurfaceLift) => void;
  /** ── Appearance: typography ── */
  /** Heading typeface. Independent from the body face since the pairing matters. */
  fontDisplayFamily: string;
  setFontDisplayFamily: (f: string) => void;
  /** How fast the type scale grows from caption to display. */
  typeRatio: string;
  setTypeRatio: (r: string) => void;
  /** Line-height multiplier — the main reading-comfort control for Arabic. */
  typeLeading: string;
  setTypeLeading: (l: string) => void;
  /** ── Appearance: interface geometry ── */
  /** Multiplier on the whole radius ladder. 0 = square, 1 = default, 1.6 = pill. */
  cornerSoftness: number;
  setCornerSoftness: (v: number) => void;
  /** Card padding, control heights, stack gaps, page gutters. */
  uiDensity: string;
  setUiDensity: (v: string) => void;
  /** Measure of the single content column. */
  contentWidth: string;
  setContentWidth: (v: string) => void;
  /** Hairline volume — with no shadows, the border is the edge of a surface. */
  borderStrength: string;
  setBorderStrength: (v: string) => void;
  /** ── Appearance: advanced interface behavior ── */
  uiScale: number;
  setUiScale: (v: number) => void;
  adaptiveLayout: boolean;
  setAdaptiveLayout: (v: boolean) => void;
  surfaceMaterial: SurfaceMaterial;
  setSurfaceMaterial: (v: SurfaceMaterial) => void;
  interactionStyle: InteractionStyle;
  setInteractionStyle: (v: InteractionStyle) => void;
  reducedTransparency: boolean;
  setReducedTransparency: (v: boolean) => void;
  strongerContrast: boolean;
  setStrongerContrast: (v: boolean) => void;
  largeTouchTargets: boolean;
  setLargeTouchTargets: (v: boolean) => void;
  clearerFocus: boolean;
  setClearerFocus: (v: boolean) => void;
  /** ── Interface v3: fine-grain dimensions ── */
  /** Multiplier on every gap, gutter and card padding. Independent of uiScale. */
  spacingScale: number;
  setSpacingScale: (v: number) => void;
  /** How the four-step radius ladder spreads. */
  radiusProfile: RadiusProfile;
  setRadiusProfile: (v: RadiusProfile) => void;
  /** Hairline thickness in px for every governed surface edge. */
  borderWidth: number;
  setBorderWidth: (v: number) => void;
  /** Volume of in-surface row dividers. */
  dividerStyle: DividerStyle;
  setDividerStyle: (v: DividerStyle) => void;
  /** Multiplier on the icon stroke weight resolved from the interaction style. */
  iconWeightScale: number;
  setIconWeightScale: (v: number) => void;
  /** Multiplier on the size of the tinted row-icon chip. */
  rowIconScale: number;
  setRowIconScale: (v: number) => void;
  /** Gap in px between a focused element and its focus ring. */
  focusOffset: number;
  setFocusOffset: (v: number) => void;
  /** Multiplier on the press scale + travel resolved from the interaction style. */
  pressDepth: number;
  setPressDepth: (v: number) => void;
  /** Absolute floor in px for any interactive target. */
  tapTargetMin: number;
  setTapTargetMin: (v: number) => void;
  /** Content measure in px, used when `contentWidth` is `custom`. */
  contentWidthCustom: number;
  setContentWidthCustom: (v: number) => void;
  /** Multiplier on the shared page/panel header height. */
  headerScale: number;
  setHeaderScale: (v: number) => void;
  /** Scrollbar affordance. */
  scrollbarStyle: ScrollbarStyle;
  setScrollbarStyle: (v: ScrollbarStyle) => void;
  /** Extra px below every page, on top of the device safe area. */
  safeAreaExtra: number;
  setSafeAreaExtra: (v: number) => void;
  applyAdvancedInterfacePreferences: (preferences: unknown) => void;
  resetInterfacePreferences: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  paletteStyle: PaletteStyle;
  setPaletteStyle: (style: PaletteStyle) => void;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
  blackMode: boolean;
  setBlackMode: (v: boolean) => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;
  fontSize: string;
  setFontSize: (s: string) => void;
  fontWeight: number;
  setFontWeight: (w: number) => void;
  fontOpacity: number;
  setFontOpacity: (o: number) => void;
  prayerMadhab: PrayerMadhab;
  setPrayerMadhab: (m: PrayerMadhab) => void;
  midnightMode: number;
  setMidnightMode: (m: number) => void;
  latitudeAdjMethod: LatitudeAdjMethod;
  setLatitudeAdjMethod: (m: LatitudeAdjMethod) => void;
  dstEnabled: boolean;
  setDstEnabled: (v: boolean) => void;
  calcMethod: CalcMethod;
  setCalcMethod: (m: CalcMethod) => void;
  /** Global animation-duration multiplier. 1 = normal, <1 = slower, >1 = faster. */
  motionSpeed: number;
  setMotionSpeed: (s: number) => void;
  /** Hard rAF cap. 'auto' = uncapped (browser native). */
  fpsCap: FpsCap;
  setFpsCap: (f: FpsCap) => void;
  /** Global motion amplitude (translate distance + parallax). 0 = none, 1 = spec, 1.5 = cinematic. */
  motionAmplitude: number;
  setMotionAmplitude: (a: number) => void;
  /** Spring bounce 0..1. 0 = critically damped, 1 = pronounced overshoot. */
  springBounce: number;
  setSpringBounce: (b: number) => void;
  /** ── Motion platform ── */
  /** How a screen enters and leaves. */
  navStyle: NavTransitionStyle;
  setNavStyle: (v: NavTransitionStyle) => void;
  /** The curve family the whole app speaks. */
  easingProfile: EasingProfile;
  setEasingProfile: (v: EasingProfile) => void;
  /** Scroll behaviour and how hard the scroll frame budget is defended. */
  scrollProfile: ScrollProfile;
  setScrollProfile: (v: ScrollProfile) => void;
  /** How transient surfaces (menus, dialogs, popovers) appear. */
  overlayStyle: OverlayStyle;
  setOverlayStyle: (v: OverlayStyle) => void;
  /** Multiplier applied to screen transitions only. */
  navDuration: number;
  setNavDuration: (v: number) => void;
  /** Cadence of page/list entrance staggering. 0 = every child at once. */
  listStagger: number;
  setListStagger: (v: number) => void;
  /** How much of the press response actually moves. */
  pressFeedback: number;
  setPressFeedback: (v: number) => void;
  /** In-app reduced motion. ORs with the OS preference. */
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  /** Edge-swipe- gesture. */
  gestureBack: boolean;
  setGestureBack: (v: boolean) => void;
  /** How little travel commits the swipe-back. Higher = more sensitive. */
  gestureSensitivity: number;
  setGestureSensitivity: (v: number) => void;
  /** Let the runtime degrade motion when frames are being dropped. */
  adaptivePerformance: boolean;
  setAdaptivePerformance: (v: boolean) => void;
  /** GPU layer promotion for animated surfaces. */
  compositorHints: boolean;
  setCompositorHints: (v: boolean) => void;
  /** Apply a sanitized motion document (import, cloud, saved profile). */
  applyMotionPreferences: (preferences: unknown) => void;
  /** Apply one of the complete named motion characters. */
  applyMotionPreset: (id: string) => void;
  /** Restore every motion setting — both halves — to its shipped value. */
  resetMotionPreferences: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// How long to wait before flushing settings to the database after a setting
// change. Multiple rapid changes coalesce into a single upsert.
const SAVE_DEBOUNCE_MS = 400;

/**
 * The pre-v2 era stored these eight settings in their own keys. We keep
 * mirroring them so a downgrade — or any other tab still running an older
 * bundle — reads a coherent state. The thirteen v3 fields were never mirrored
 * and deliberately are not: the versioned document is their only home.
 */
const ADVANCED_LEGACY_KEYS: Partial<Record<keyof AdvancedInterfacePreferences, string>> = {
  uiScale: 'app-ui-scale',
  adaptiveLayout: 'app-adaptive-layout',
  surfaceMaterial: 'app-surface-material',
  interactionStyle: 'app-interaction-style',
  reducedTransparency: 'app-reduced-transparency',
  strongerContrast: 'app-stronger-contrast',
  largeTouchTargets: 'app-large-touch-targets',
  clearerFocus: 'app-clearer-focus',
};

function persistAdvancedInterfacePreferences(preferences: AdvancedInterfacePreferences) {
  const profile = writeAppearancePreferences(preferences);
  for (const [key, storageKey] of Object.entries(ADVANCED_LEGACY_KEYS) as [
    keyof AdvancedInterfacePreferences,
    string,
  ][]) {
    try {
      localStorage.setItem(storageKey, String(profile[key]));
    } catch {
      // The versioned writer and React state remain authoritative when storage
      // is unavailable.
    }
  }
  return sanitizeAdvancedInterfacePreferences(profile);
}

function persistMotionPreferences(preferences: MotionPreferences): MotionPreferences {
  return sanitizeMotionPreferences(writeMotionPreferences(preferences));
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Arabic-only. Any legacy 'de' preference is coerced to 'ar' on load.
  // Do not reintroduce other locales — see src/i18n/index.ts.
  const [language, setLanguageState] = useState<Language>('ar');
  const [theme, setThemeState] = useState<Theme>(() => {
    const raw = localStorage.getItem('app-theme');
    return raw === 'dark' ? 'dark' : 'light';
  });
  const [paletteStyle, setPaletteStyleState] = useState<PaletteStyle>(
    () => (localStorage.getItem('app-palette-style') as PaletteStyle) || 'neutral',
  );
  const [blackMode, setBlackModeState] = useState<boolean>(
    () => localStorage.getItem('app-black-mode') === 'true',
  );
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(
    () =>
      // 'default' is the shipped 7-tone palette (#f1f0f4 → #1c1827).
      (localStorage.getItem('app-color-theme') as ColorTheme) || 'default',
  );

  const [surfaceLift, setSurfaceLiftState] = useState<SurfaceLift>(() =>
    resolveSurfaceLift(localStorage.getItem('app-surface-lift')),
  );

  const [fontFamily, setFontFamilyState] = useState<string>(() =>
    resolveFontId(localStorage.getItem('app-font-family')),
  );
  const [fontDisplayFamily, setFontDisplayFamilyState] = useState<string>(() =>
    // Falls back to the body face, so an upgrade from the single-font era
    // starts from exactly the typography the user already had.
    resolveFontId(
      localStorage.getItem('app-font-display') ?? localStorage.getItem('app-font-family'),
    ),
  );
  const [fontSize, setFontSizeState] = useState<string>(() =>
    resolveFontSize(localStorage.getItem('app-font-size')),
  );
  const [typeRatio, setTypeRatioState] = useState<string>(() =>
    resolveTypeRatio(localStorage.getItem('app-type-ratio')),
  );
  const [typeLeading, setTypeLeadingState] = useState<string>(() =>
    resolveTypeLeading(localStorage.getItem('app-type-leading')),
  );

  const [cornerSoftness, setCornerSoftnessState] = useState<number>(() =>
    clampCornerSoftness(parseFloat(localStorage.getItem('app-corner-softness') ?? '1')),
  );
  const [uiDensity, setUiDensityState] = useState<string>(() =>
    resolveDensity(localStorage.getItem('app-ui-density')),
  );
  const [contentWidth, setContentWidthState] = useState<string>(() =>
    resolveWidth(localStorage.getItem('app-content-width')),
  );
  const [borderStrength, setBorderStrengthState] = useState<string>(() =>
    resolveBorder(localStorage.getItem('app-border-strength')),
  );
  const [advancedInterfacePreferences, setAdvancedInterfacePreferencesState] =
    useState<AdvancedInterfacePreferences>(() =>
      sanitizeAdvancedInterfacePreferences(readAppearancePreferences()),
    );
  const advancedInterfacePreferencesRef = useRef(advancedInterfacePreferences);
  const {
    uiScale,
    adaptiveLayout,
    surfaceMaterial,
    interactionStyle,
    reducedTransparency,
    strongerContrast,
    largeTouchTargets,
    clearerFocus,
    spacingScale,
    radiusProfile,
    borderWidth,
    dividerStyle,
    iconWeightScale,
    rowIconScale,
    focusOffset,
    pressDepth,
    tapTargetMin,
    contentWidthCustom,
    headerScale,
    scrollbarStyle,
    safeAreaExtra,
  } = advancedInterfacePreferences;

  // The motion platform's versioned half. Speed / amplitude / bounce / fps cap
  // keep their own keys below because they predate this document and are
  // already mirrored to the cloud one field at a time.
  const [motionPreferences, setMotionPreferencesState] = useState<MotionPreferences>(() =>
    sanitizeMotionPreferences(readMotionPreferences()),
  );
  const motionPreferencesRef = useRef(motionPreferences);
  const {
    navStyle,
    easingProfile,
    scrollProfile,
    overlayStyle,
    navDuration,
    listStagger,
    pressFeedback,
    reduceMotion,
    gestureBack,
    gestureSensitivity,
    adaptivePerformance,
    compositorHints,
  } = motionPreferences;
  const [fontWeight, setFontWeightState] = useState<number>(() =>
    clampFontWeight(parseInt(localStorage.getItem('app-font-weight') ?? '400', 10)),
  );
  const [fontOpacity, setFontOpacityState] = useState<number>(() =>
    parseFloat(localStorage.getItem('app-font-opacity') || '1'),
  );
  const [prayerMadhab, setPrayerMadhabState] = useState<PrayerMadhab>(
    () => (localStorage.getItem('app-prayer-madhab') as PrayerMadhab) || 'shafii',
  );
  const [midnightMode, setMidnightModeState] = useState<number>(() =>
    parseInt(localStorage.getItem('app-midnight-mode') || '0', 10),
  );
  const [latitudeAdjMethod, setLatitudeAdjMethodState] = useState<LatitudeAdjMethod>(
    () => (localStorage.getItem('app-lat-adj-method') as LatitudeAdjMethod) || 'angle',
  );
  const [dstEnabled, setDstEnabledState] = useState<boolean>(
    () => localStorage.getItem('app-dst-enabled') !== 'false',
  );
  const [calcMethod, setCalcMethodState] = useState<CalcMethod>(() => {
    const raw = localStorage.getItem('app-calc-method');
    if (!raw || raw === 'auto') return 'auto';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 'auto';
  });
  const [motionSpeed, setMotionSpeedState] = useState<number>(() => {
    const raw = parseFloat(localStorage.getItem('app-motion-speed') || '1');
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });
  const [fpsCap, setFpsCapState] = useState<FpsCap>(() => {
    const raw = localStorage.getItem('app-fps-cap');
    if (raw === '60' || raw === '90' || raw === '120') return Number(raw) as FpsCap;
    return 'auto';
  });
  const [motionAmplitude, setMotionAmplitudeState] = useState<number>(() => {
    const raw = parseFloat(localStorage.getItem('app-motion-amplitude') || '1');
    return Number.isFinite(raw) && raw >= 0 ? raw : 1;
  });
  const [springBounce, setSpringBounceState] = useState<number>(() => {
    const raw = parseFloat(localStorage.getItem('app-spring-bounce') || '0');
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  });

  const authUserRef = useRef<User | null>(null);
  const syncRef = useRef(false);
  const initialLoadDone = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset all state & localStorage to defaults.
  //
  // Called on the user → null auth transition (sign-out). The previous
  // implementation only zeroed out the keys it personally knew about,
  // which let scratch state from other features (mihrab tab, wellness,
  // tafsir, dynamic preset, lastLocation, …) leak across accounts on
  // shared devices. We now sweep every `app-*` key plus an explicit
  // allowlist of feature-scoped scratch keys, then re-seed defaults.
  const FEATURE_SCRATCH_KEYS = [
    'game-stats',
    'saved-locations',
    'lastLocation',
    'mihrab:lastTab',
    'wellness:lastTab',
    'wellness:onboarded',
    'tafsir-state',
    'reading:state',
    'rss:lastFeed',
    'clipboard:draft',
  ];
  const resetToDefaults = () => {
    syncRef.current = true;
    // Sweep every app-* preference key (covers app-dynamic-preset and
    // any future app-prefixed setting we add without touching this list).
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('app-')) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* storage may be blocked in private mode — ignore */
    }
    FEATURE_SCRATCH_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* storage may be blocked */
      }
    });

    // Re-seed default values + state.
    setLanguageState('ar');
    localStorage.setItem('app-language', 'ar');
    setThemeState('light');
    localStorage.setItem('app-theme', 'light');
    // Must match the initial-state default above ('neutral'). Using a
    // different value here made sign-out change the app's look.
    setPaletteStyleState('neutral');
    localStorage.setItem('app-palette-style', 'neutral');
    setBlackModeState(false);
    localStorage.setItem('app-black-mode', 'false');
    setColorThemeState('default');
    localStorage.setItem('app-color-theme', 'default');

    setSurfaceLiftState(DEFAULT_SURFACE_LIFT);
    localStorage.setItem('app-surface-lift', DEFAULT_SURFACE_LIFT);

    setFontFamilyState(DEFAULT_FONT_ID);
    localStorage.setItem('app-font-family', DEFAULT_FONT_ID);
    setFontDisplayFamilyState(DEFAULT_DISPLAY_FONT_ID);
    localStorage.setItem('app-font-display', DEFAULT_DISPLAY_FONT_ID);
    setFontSizeState('medium');
    localStorage.setItem('app-font-size', 'medium');
    setTypeRatioState('balanced');
    localStorage.setItem('app-type-ratio', 'balanced');
    setTypeLeadingState('normal');
    localStorage.setItem('app-type-leading', 'normal');
    setFontWeightState(400);
    localStorage.setItem('app-font-weight', '400');
    setFontOpacityState(1);
    localStorage.setItem('app-font-opacity', '1');

    setCornerSoftnessState(DEFAULT_CORNER_SOFTNESS);
    localStorage.setItem('app-corner-softness', String(DEFAULT_CORNER_SOFTNESS));
    setUiDensityState(DEFAULT_DENSITY);
    localStorage.setItem('app-ui-density', DEFAULT_DENSITY);
    setContentWidthState(DEFAULT_WIDTH);
    localStorage.setItem('app-content-width', DEFAULT_WIDTH);
    setBorderStrengthState(DEFAULT_BORDER);
    localStorage.setItem('app-border-strength', DEFAULT_BORDER);
    const defaultAdvanced = persistAdvancedInterfacePreferences(
      DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
    );
    advancedInterfacePreferencesRef.current = defaultAdvanced;
    setAdvancedInterfacePreferencesState(defaultAdvanced);
    setPrayerMadhabState('shafii');
    localStorage.setItem('app-prayer-madhab', 'shafii');
    setMidnightModeState(0);
    localStorage.setItem('app-midnight-mode', '0');
    setLatitudeAdjMethodState('angle');
    localStorage.setItem('app-lat-adj-method', 'angle');
    setDstEnabledState(true);
    localStorage.setItem('app-dst-enabled', 'true');
    setCalcMethodState('auto');
    localStorage.setItem('app-calc-method', 'auto');
    setMotionSpeedState(1);
    localStorage.setItem('app-motion-speed', '1');
    setFpsCapState('auto');
    localStorage.setItem('app-fps-cap', 'auto');
    setMotionAmplitudeState(1);
    localStorage.setItem('app-motion-amplitude', '1');
    setSpringBounceState(0);
    localStorage.setItem('app-spring-bounce', '0');
    const defaultMotion = persistMotionPreferences(DEFAULT_MOTION_PREFERENCES);
    motionPreferencesRef.current = defaultMotion;
    setMotionPreferencesState(defaultMotion);
    setTimeout(() => {
      syncRef.current = false;
    }, 100);
  };

  // Auth state — pulled from the singleton `useAuth` hook so this component
  // and every other consumer (BottomNav, Settings, ProfileEdit, …) share
  // one underlying `onAuthStateChange` subscription. Previously this
  // provider ran its OWN parallel subscription; that meant every auth
  // change triggered two profile fetches and the two stores could
  // momentarily disagree.
  const { user: authUser } = useAuth();
  const prevAuthUserRef = useRef<User | null>(null);

  useEffect(() => {
    authUserRef.current = authUser;
    const prev = prevAuthUserRef.current;
    prevAuthUserRef.current = authUser;
    // Only the user → null transition counts as a sign-out worth
    // resetting preferences for. Initial mount when the user starts out
    // null must NOT clobber any locally-saved settings.
    if (prev && !authUser) resetToDefaults();
  }, [authUser]);

  // Load settings from DB when user logs in
  useEffect(() => {
    if (!authUser) {
      initialLoadDone.current = false;
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (data?.settings && typeof data.settings === 'object') {
        const s = data.settings as Record<string, any>;
        syncRef.current = true; // prevent save-back during load
        // Language is locked to 'ar' — ignore any cloud-persisted preference.
        localStorage.setItem('app-language', 'ar');
        if (s.theme) {
          setThemeState(s.theme);
          localStorage.setItem('app-theme', s.theme);
        }
        if (s.paletteStyle) {
          setPaletteStyleState(s.paletteStyle);
          localStorage.setItem('app-palette-style', s.paletteStyle);
        }
        if (s.blackMode !== undefined) {
          setBlackModeState(s.blackMode);
          localStorage.setItem('app-black-mode', String(s.blackMode));
        }
        if (s.colorTheme) {
          setColorThemeState(s.colorTheme);
          localStorage.setItem('app-color-theme', s.colorTheme);
        }

        if (s.surfaceLift) {
          const lift = resolveSurfaceLift(s.surfaceLift);
          setSurfaceLiftState(lift);
          localStorage.setItem('app-surface-lift', lift);
        }
        if (s.fontFamily) {
          const id = resolveFontId(s.fontFamily);
          setFontFamilyState(id);
          localStorage.setItem('app-font-family', id);
        }
        if (s.fontDisplayFamily) {
          const id = resolveFontId(s.fontDisplayFamily);
          setFontDisplayFamilyState(id);
          localStorage.setItem('app-font-display', id);
        }
        if (s.typeRatio) {
          const r = resolveTypeRatio(s.typeRatio);
          setTypeRatioState(r);
          localStorage.setItem('app-type-ratio', r);
        }
        if (s.typeLeading) {
          const l = resolveTypeLeading(s.typeLeading);
          setTypeLeadingState(l);
          localStorage.setItem('app-type-leading', l);
        }
        if (s.cornerSoftness !== undefined) {
          const c = clampCornerSoftness(Number(s.cornerSoftness));
          setCornerSoftnessState(c);
          localStorage.setItem('app-corner-softness', String(c));
        }
        if (s.uiDensity) {
          const d = resolveDensity(s.uiDensity);
          setUiDensityState(d);
          localStorage.setItem('app-ui-density', d);
        }
        if (s.contentWidth) {
          const w = resolveWidth(s.contentWidth);
          setContentWidthState(w);
          localStorage.setItem('app-content-width', w);
        }
        if (s.borderStrength) {
          const b = resolveBorder(s.borderStrength);
          setBorderStrengthState(b);
          localStorage.setItem('app-border-strength', b);
        }
        const nestedAppearance =
          s.appearancePreferences && typeof s.appearancePreferences === 'object'
            ? s.appearancePreferences
            : null;
        const advancedSource = nestedAppearance ?? s;
        const hasAdvancedPreferences =
          nestedAppearance !== null ||
          Object.keys(ADVANCED_LEGACY_KEYS).some((key) => advancedSource[key] !== undefined);
        if (hasAdvancedPreferences) {
          const advanced = sanitizeAdvancedInterfacePreferences(
            advancedSource,
            advancedInterfacePreferencesRef.current,
          );
          advancedInterfacePreferencesRef.current = persistAdvancedInterfacePreferences(advanced);
          setAdvancedInterfacePreferencesState(advancedInterfacePreferencesRef.current);
        }
        if (s.fontSize) {
          const sz = resolveFontSize(s.fontSize);
          setFontSizeState(sz);
          localStorage.setItem('app-font-size', sz);
        }
        if (s.fontWeight !== undefined) {
          const w = clampFontWeight(Number(s.fontWeight));
          setFontWeightState(w);
          localStorage.setItem('app-font-weight', String(w));
        }
        if (s.fontOpacity !== undefined) {
          setFontOpacityState(s.fontOpacity);
          localStorage.setItem('app-font-opacity', String(s.fontOpacity));
        }
        if (s.prayerMadhab) {
          setPrayerMadhabState(s.prayerMadhab);
          localStorage.setItem('app-prayer-madhab', s.prayerMadhab);
        }
        if (s.midnightMode !== undefined) {
          setMidnightModeState(s.midnightMode);
          localStorage.setItem('app-midnight-mode', String(s.midnightMode));
        }
        if (s.latitudeAdjMethod) {
          setLatitudeAdjMethodState(s.latitudeAdjMethod);
          localStorage.setItem('app-lat-adj-method', s.latitudeAdjMethod);
        }
        if (s.dstEnabled !== undefined) {
          setDstEnabledState(s.dstEnabled);
          localStorage.setItem('app-dst-enabled', String(s.dstEnabled));
        }
        if (s.calcMethod !== undefined) {
          const cm: CalcMethod = s.calcMethod === 'auto' ? 'auto' : Number(s.calcMethod);
          setCalcMethodState(cm);
          localStorage.setItem('app-calc-method', String(cm));
        }
        if (typeof s.motionSpeed === 'number' && s.motionSpeed > 0) {
          setMotionSpeedState(s.motionSpeed);
          localStorage.setItem('app-motion-speed', String(s.motionSpeed));
        }
        if (s.fpsCap === 'auto' || s.fpsCap === 60 || s.fpsCap === 90 || s.fpsCap === 120) {
          setFpsCapState(s.fpsCap as FpsCap);
          localStorage.setItem('app-fps-cap', String(s.fpsCap));
        }
        if (typeof s.motionAmplitude === 'number' && s.motionAmplitude >= 0) {
          setMotionAmplitudeState(s.motionAmplitude);
          localStorage.setItem('app-motion-amplitude', String(s.motionAmplitude));
        }
        if (typeof s.springBounce === 'number' && s.springBounce >= 0) {
          setSpringBounceState(s.springBounce);
          localStorage.setItem('app-spring-bounce', String(s.springBounce));
        }
        if (s.motionPreferences && typeof s.motionPreferences === 'object') {
          const motion = sanitizeMotionPreferences(
            s.motionPreferences,
            motionPreferencesRef.current,
          );
          motionPreferencesRef.current = persistMotionPreferences(motion);
          setMotionPreferencesState(motionPreferencesRef.current);
        }
        // Also load game stats and locations if stored
        if (s.gameStats) localStorage.setItem('game-stats', JSON.stringify(s.gameStats));
        if (s.savedLocations)
          localStorage.setItem('saved-locations', JSON.stringify(s.savedLocations));
        if (s.mihrab) localStorage.setItem('mihrab:lastTab', s.mihrab);
        if (s.tafsir) localStorage.setItem('tafsir-state', JSON.stringify(s.tafsir));
        if (s.tafsir_bookmarks)
          localStorage.setItem('tafsir-bookmarks', JSON.stringify(s.tafsir_bookmarks));
        if (s.browse) localStorage.setItem('browse:lastTab', s.browse);
        setTimeout(() => {
          syncRef.current = false;
        }, 100);
      }
      initialLoadDone.current = true;
    };
    load();
  }, [authUser]);

  // Save settings to DB when they change.
  // Wrapped in a coalescing debounce so that rapid changes (e.g. user dragging
  // a slider, or toggling several settings in quick succession) flush as a
  // single upsert instead of N parallel ones.
  const flushSaveToDb = useCallback(async () => {
    saveTimerRef.current = null;
    const user = authUserRef.current;
    if (!user || syncRef.current || !initialLoadDone.current) return;
    const settings: Record<string, any> = {
      language: localStorage.getItem('app-language'),
      theme: localStorage.getItem('app-theme'),
      paletteStyle: localStorage.getItem('app-palette-style'),
      blackMode: localStorage.getItem('app-black-mode') === 'true',
      colorTheme: localStorage.getItem('app-color-theme') || 'default',

      surfaceLift: resolveSurfaceLift(localStorage.getItem('app-surface-lift')),
      appearancePreferences: readAppearancePreferences(),
      ...sanitizeAdvancedInterfacePreferences(readAppearancePreferences()),

      fontFamily: resolveFontId(localStorage.getItem('app-font-family')),
      fontDisplayFamily: resolveFontId(localStorage.getItem('app-font-display')),
      typeRatio: resolveTypeRatio(localStorage.getItem('app-type-ratio')),
      typeLeading: resolveTypeLeading(localStorage.getItem('app-type-leading')),
      cornerSoftness: clampCornerSoftness(
        parseFloat(localStorage.getItem('app-corner-softness') ?? '1'),
      ),
      uiDensity: resolveDensity(localStorage.getItem('app-ui-density')),
      contentWidth: resolveWidth(localStorage.getItem('app-content-width')),
      borderStrength: resolveBorder(localStorage.getItem('app-border-strength')),
      fontSize: resolveFontSize(localStorage.getItem('app-font-size')),
      fontWeight: clampFontWeight(parseInt(localStorage.getItem('app-font-weight') ?? '400', 10)),
      fontOpacity: parseFloat(localStorage.getItem('app-font-opacity') || '1'),
      prayerMadhab: localStorage.getItem('app-prayer-madhab') || 'shafii',
      midnightMode: parseInt(localStorage.getItem('app-midnight-mode') || '0', 10),
      latitudeAdjMethod: localStorage.getItem('app-lat-adj-method') || 'angle',
      dstEnabled: localStorage.getItem('app-dst-enabled') !== 'false',
      calcMethod: localStorage.getItem('app-calc-method') ?? 'auto',
    };
    settings.fontDisplayFamily = resolveFontId(localStorage.getItem('app-font-display'));
    settings.typeRatio = resolveTypeRatio(localStorage.getItem('app-type-ratio'));
    settings.typeLeading = resolveTypeLeading(localStorage.getItem('app-type-leading'));
    settings.surfaceLift = resolveSurfaceLift(localStorage.getItem('app-surface-lift'));
    settings.cornerSoftness = clampCornerSoftness(
      parseFloat(localStorage.getItem('app-corner-softness') ?? '1'),
    );
    settings.uiDensity = resolveDensity(localStorage.getItem('app-ui-density'));
    settings.contentWidth = resolveWidth(localStorage.getItem('app-content-width'));
    settings.borderStrength = resolveBorder(localStorage.getItem('app-border-strength'));
    settings.motionSpeed = parseFloat(localStorage.getItem('app-motion-speed') || '1');
    settings.fpsCap = localStorage.getItem('app-fps-cap') || 'auto';
    settings.motionAmplitude = parseFloat(localStorage.getItem('app-motion-amplitude') || '1');
    settings.springBounce = parseFloat(localStorage.getItem('app-spring-bounce') || '0');
    settings.motionPreferences = readMotionPreferences();
    // Also save game stats and locations
    try {
      settings.gameStats = JSON.parse(localStorage.getItem('game-stats') || '{}');
    } catch {
      /* noop */
    }
    try {
      settings.savedLocations = JSON.parse(localStorage.getItem('saved-locations') || '[]');
    } catch {
      /* noop */
    }
    try {
      settings.mihrab = localStorage.getItem('mihrab:lastTab') || undefined;
    } catch {
      /* noop */
    }
    try {
      settings.tafsir = JSON.parse(localStorage.getItem('tafsir-state') || '{}');
    } catch {
      /* noop */
    }
    try {
      settings.tafsir_bookmarks = JSON.parse(localStorage.getItem('tafsir-bookmarks') || '[]');
    } catch {
      /* noop */
    }
    try {
      settings.browse = localStorage.getItem('browse:lastTab') || undefined;
    } catch {
      /* noop */
    }

    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, settings: settings as any }, { onConflict: 'user_id' });
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSaveToDb, SAVE_DEBOUNCE_MS);
  }, [flushSaveToDb]);

  // Flush any pending save when the provider unmounts or the tab is hidden,
  // so we don't lose the last change made just before navigation.
  useEffect(() => {
    const onHide = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        flushSaveToDb();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [flushSaveToDb]);

  // ────────────────────────────────────────────────────────────────────
  // Setters
  //
  // Every setter is memoised with `useCallback` and the context value is
  // memoised with `useMemo`. Without this, the provider handed a brand
  // new object (and 20 brand new functions) to all ~96 `useApp()`
  // consumers on every single render, so one preference change re-rendered
  // the entire app — and effects that depend on a setter identity (e.g.
  // useAutoPrayerTheme's 60 s interval) were torn down and rebuilt each
  // time.
  // ────────────────────────────────────────────────────────────────────

  const setLanguage = useCallback((_lang: Language) => {
    // Arabic-only. Ignore all attempts to switch language.
    setLanguageState('ar');
    localStorage.setItem('app-language', 'ar');
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      localStorage.setItem('app-theme', t);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setPaletteStyle = useCallback(
    (style: PaletteStyle) => {
      setPaletteStyleState(style);
      localStorage.setItem('app-palette-style', style);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setBlackMode = useCallback(
    (v: boolean) => {
      setBlackModeState(v);
      localStorage.setItem('app-black-mode', v.toString());
      scheduleSave();
    },
    [scheduleSave],
  );

  const setColorTheme = useCallback(
    (ct: ColorTheme) => {
      setColorThemeState(ct);
      localStorage.setItem('app-color-theme', ct);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setSurfaceLift = useCallback(
    (v: SurfaceLift) => {
      const lift = resolveSurfaceLift(v);
      setSurfaceLiftState(lift);
      localStorage.setItem('app-surface-lift', lift);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setFontFamily = useCallback(
    (f: string) => {
      const id = resolveFontId(f);
      setFontFamilyState(id);
      localStorage.setItem('app-font-family', id);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setFontDisplayFamily = useCallback(
    (f: string) => {
      const id = resolveFontId(f);
      setFontDisplayFamilyState(id);
      localStorage.setItem('app-font-display', id);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setTypeRatio = useCallback(
    (r: string) => {
      const ratio = resolveTypeRatio(r);
      setTypeRatioState(ratio);
      localStorage.setItem('app-type-ratio', ratio);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setTypeLeading = useCallback(
    (l: string) => {
      const leading = resolveTypeLeading(l);
      setTypeLeadingState(leading);
      localStorage.setItem('app-type-leading', leading);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setCornerSoftness = useCallback(
    (v: number) => {
      const clamped = clampCornerSoftness(v);
      setCornerSoftnessState(clamped);
      localStorage.setItem('app-corner-softness', String(clamped));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setUiDensity = useCallback(
    (v: string) => {
      const density = resolveDensity(v);
      setUiDensityState(density);
      localStorage.setItem('app-ui-density', density);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setContentWidth = useCallback(
    (v: string) => {
      const width = resolveWidth(v);
      setContentWidthState(width);
      localStorage.setItem('app-content-width', width);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setBorderStrength = useCallback(
    (v: string) => {
      const border = resolveBorder(v);
      setBorderStrengthState(border);
      localStorage.setItem('app-border-strength', border);
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateAdvancedInterfacePreferences = useCallback(
    (patch: Partial<AdvancedInterfacePreferences>) => {
      const next = sanitizeAdvancedInterfacePreferences(
        { ...advancedInterfacePreferencesRef.current, ...patch },
        advancedInterfacePreferencesRef.current,
      );
      advancedInterfacePreferencesRef.current = persistAdvancedInterfacePreferences(next);
      setAdvancedInterfacePreferencesState(advancedInterfacePreferencesRef.current);
      scheduleSave();
    },
    [scheduleSave],
  );

  const applyAdvancedInterfacePreferences = useCallback(
    (preferences: unknown) => {
      const next = sanitizeAdvancedInterfacePreferences(
        preferences,
        advancedInterfacePreferencesRef.current,
      );
      advancedInterfacePreferencesRef.current = persistAdvancedInterfacePreferences(next);
      setAdvancedInterfacePreferencesState(advancedInterfacePreferencesRef.current);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setUiScale = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ uiScale: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setAdaptiveLayout = useCallback(
    (value: boolean) => updateAdvancedInterfacePreferences({ adaptiveLayout: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setSurfaceMaterial = useCallback(
    (value: SurfaceMaterial) => updateAdvancedInterfacePreferences({ surfaceMaterial: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setInteractionStyle = useCallback(
    (value: InteractionStyle) => updateAdvancedInterfacePreferences({ interactionStyle: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setReducedTransparency = useCallback(
    (value: boolean) => updateAdvancedInterfacePreferences({ reducedTransparency: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setStrongerContrast = useCallback(
    (value: boolean) => updateAdvancedInterfacePreferences({ strongerContrast: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setLargeTouchTargets = useCallback(
    (value: boolean) => updateAdvancedInterfacePreferences({ largeTouchTargets: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setClearerFocus = useCallback(
    (value: boolean) => updateAdvancedInterfacePreferences({ clearerFocus: value }),
    [updateAdvancedInterfacePreferences],
  );

  /* ── Interface v3 setters ────────────────────────────────────────── */
  const setSpacingScale = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ spacingScale: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setRadiusProfile = useCallback(
    (value: RadiusProfile) => updateAdvancedInterfacePreferences({ radiusProfile: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setBorderWidth = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ borderWidth: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setDividerStyle = useCallback(
    (value: DividerStyle) => updateAdvancedInterfacePreferences({ dividerStyle: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setIconWeightScale = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ iconWeightScale: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setRowIconScale = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ rowIconScale: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setFocusOffset = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ focusOffset: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setPressDepth = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ pressDepth: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setTapTargetMin = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ tapTargetMin: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setContentWidthCustom = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ contentWidthCustom: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setHeaderScale = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ headerScale: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setScrollbarStyle = useCallback(
    (value: ScrollbarStyle) => updateAdvancedInterfacePreferences({ scrollbarStyle: value }),
    [updateAdvancedInterfacePreferences],
  );
  const setSafeAreaExtra = useCallback(
    (value: number) => updateAdvancedInterfacePreferences({ safeAreaExtra: value }),
    [updateAdvancedInterfacePreferences],
  );

  const resetInterfacePreferences = useCallback(() => {
    setCornerSoftness(DEFAULT_CORNER_SOFTNESS);
    setUiDensity(DEFAULT_DENSITY);
    setContentWidth(DEFAULT_WIDTH);
    setBorderStrength(DEFAULT_BORDER);
    setSurfaceLift(DEFAULT_SURFACE_LIFT);
    applyAdvancedInterfacePreferences(DEFAULT_ADVANCED_INTERFACE_PREFERENCES);
  }, [
    applyAdvancedInterfacePreferences,
    setBorderStrength,
    setContentWidth,
    setCornerSoftness,
    setSurfaceLift,
    setUiDensity,
  ]);

  const setFontSize = useCallback(
    (s: string) => {
      const size = resolveFontSize(s);
      setFontSizeState(size);
      localStorage.setItem('app-font-size', size);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setFontWeight = useCallback(
    (w: number) => {
      const clamped = clampFontWeight(w);
      setFontWeightState(clamped);
      localStorage.setItem('app-font-weight', String(clamped));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setFontOpacity = useCallback(
    (o: number) => {
      setFontOpacityState(o);
      localStorage.setItem('app-font-opacity', String(o));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setPrayerMadhab = useCallback(
    (m: PrayerMadhab) => {
      setPrayerMadhabState(m);
      localStorage.setItem('app-prayer-madhab', m);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setMidnightMode = useCallback(
    (m: number) => {
      setMidnightModeState(m);
      localStorage.setItem('app-midnight-mode', String(m));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setLatitudeAdjMethod = useCallback(
    (m: LatitudeAdjMethod) => {
      setLatitudeAdjMethodState(m);
      localStorage.setItem('app-lat-adj-method', m);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setDstEnabled = useCallback(
    (v: boolean) => {
      setDstEnabledState(v);
      localStorage.setItem('app-dst-enabled', String(v));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setCalcMethod = useCallback(
    (m: CalcMethod) => {
      setCalcMethodState(m);
      localStorage.setItem('app-calc-method', String(m));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setMotionSpeed = useCallback(
    (s: number) => {
      const clamped = Math.max(0.25, Math.min(3, s));
      setMotionSpeedState(clamped);
      localStorage.setItem('app-motion-speed', String(clamped));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setFpsCap = useCallback(
    (f: FpsCap) => {
      setFpsCapState(f);
      localStorage.setItem('app-fps-cap', String(f));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setMotionAmplitude = useCallback(
    (a: number) => {
      const clamped = Math.max(0, Math.min(1.5, a));
      setMotionAmplitudeState(clamped);
      localStorage.setItem('app-motion-amplitude', String(clamped));
      scheduleSave();
    },
    [scheduleSave],
  );

  const setSpringBounce = useCallback(
    (b: number) => {
      const clamped = Math.max(0, Math.min(1, b));
      setSpringBounceState(clamped);
      localStorage.setItem('app-spring-bounce', String(clamped));
      scheduleSave();
    },
    [scheduleSave],
  );

  /* ── Motion platform ─────────────────────────────────────────────── */

  const updateMotionPreferences = useCallback(
    (patch: Partial<MotionPreferences>) => {
      const next = sanitizeMotionPreferences(
        { ...motionPreferencesRef.current, ...patch },
        motionPreferencesRef.current,
      );
      motionPreferencesRef.current = persistMotionPreferences(next);
      setMotionPreferencesState(motionPreferencesRef.current);
      scheduleSave();
    },
    [scheduleSave],
  );

  const applyMotionPreferences = useCallback(
    (preferences: unknown) => {
      const next = sanitizeMotionPreferences(preferences, motionPreferencesRef.current);
      motionPreferencesRef.current = persistMotionPreferences(next);
      setMotionPreferencesState(motionPreferencesRef.current);
      scheduleSave();
    },
    [scheduleSave],
  );

  const setNavStyle = useCallback(
    (value: NavTransitionStyle) => updateMotionPreferences({ navStyle: value }),
    [updateMotionPreferences],
  );
  const setEasingProfile = useCallback(
    (value: EasingProfile) => updateMotionPreferences({ easingProfile: value }),
    [updateMotionPreferences],
  );
  const setScrollProfileSetting = useCallback(
    (value: ScrollProfile) => updateMotionPreferences({ scrollProfile: value }),
    [updateMotionPreferences],
  );
  const setOverlayStyle = useCallback(
    (value: OverlayStyle) => updateMotionPreferences({ overlayStyle: value }),
    [updateMotionPreferences],
  );
  const setNavDuration = useCallback(
    (value: number) => updateMotionPreferences({ navDuration: value }),
    [updateMotionPreferences],
  );
  const setListStagger = useCallback(
    (value: number) => updateMotionPreferences({ listStagger: value }),
    [updateMotionPreferences],
  );
  const setPressFeedback = useCallback(
    (value: number) => updateMotionPreferences({ pressFeedback: value }),
    [updateMotionPreferences],
  );
  const setReduceMotion = useCallback(
    (value: boolean) => updateMotionPreferences({ reduceMotion: value }),
    [updateMotionPreferences],
  );
  const setGestureBack = useCallback(
    (value: boolean) => updateMotionPreferences({ gestureBack: value }),
    [updateMotionPreferences],
  );
  const setGestureSensitivity = useCallback(
    (value: number) => updateMotionPreferences({ gestureSensitivity: value }),
    [updateMotionPreferences],
  );
  const setAdaptivePerformance = useCallback(
    (value: boolean) => updateMotionPreferences({ adaptivePerformance: value }),
    [updateMotionPreferences],
  );
  const setCompositorHints = useCallback(
    (value: boolean) => updateMotionPreferences({ compositorHints: value }),
    [updateMotionPreferences],
  );

  /**
   * A motion preset is a complete character, so it writes BOTH halves of the
   * platform: the versioned document AND the four legacy runtime keys. A preset
   * that only changed the easing would not actually feel different.
   */
  const applyMotionPreset = useCallback(
    (id: string) => {
      const preset = MOTION_PRESETS.find((item) => item.id === id);
      if (!preset) return;
      const { speed, amplitude, bounce, ...preferences } = preset.values;
      setMotionSpeed(speed);
      setMotionAmplitude(amplitude);
      setSpringBounce(bounce);
      applyMotionPreferences(preferences);
    },
    [applyMotionPreferences, setMotionAmplitude, setMotionSpeed, setSpringBounce],
  );

  const resetMotionPreferences = useCallback(() => {
    setMotionSpeed(1);
    setMotionAmplitude(1);
    setSpringBounce(0);
    setFpsCap('auto');
    applyMotionPreferences(DEFAULT_MOTION_PREFERENCES);
  }, [applyMotionPreferences, setFpsCap, setMotionAmplitude, setMotionSpeed, setSpringBounce]);

  // Keep open tabs visually synchronized without routing storage events back
  // through public setters (which would schedule a redundant cloud write).
  useEffect(() => {
    const syncAllAppearanceState = () => {
      setThemeState(localStorage.getItem('app-theme') === 'dark' ? 'dark' : 'light');
      setPaletteStyleState(
        (localStorage.getItem('app-palette-style') as PaletteStyle) || 'neutral',
      );
      setBlackModeState(localStorage.getItem('app-black-mode') === 'true');
      setColorThemeState((localStorage.getItem('app-color-theme') as ColorTheme) || 'default');
      setSurfaceLiftState(resolveSurfaceLift(localStorage.getItem('app-surface-lift')));
      setFontFamilyState(resolveFontId(localStorage.getItem('app-font-family')));
      setFontDisplayFamilyState(
        resolveFontId(localStorage.getItem('app-font-display') ?? DEFAULT_DISPLAY_FONT_ID),
      );
      setFontSizeState(resolveFontSize(localStorage.getItem('app-font-size')));
      setTypeRatioState(resolveTypeRatio(localStorage.getItem('app-type-ratio')));
      setTypeLeadingState(resolveTypeLeading(localStorage.getItem('app-type-leading')));
      setFontWeightState(clampFontWeight(Number(localStorage.getItem('app-font-weight') ?? 400)));
      const storedOpacity = Number(localStorage.getItem('app-font-opacity') ?? 1);
      setFontOpacityState(Number.isFinite(storedOpacity) ? storedOpacity : 1);
      setCornerSoftnessState(
        clampCornerSoftness(Number(localStorage.getItem('app-corner-softness') ?? 1)),
      );
      setUiDensityState(resolveDensity(localStorage.getItem('app-ui-density')));
      setContentWidthState(resolveWidth(localStorage.getItem('app-content-width')));
      setBorderStrengthState(resolveBorder(localStorage.getItem('app-border-strength')));
      const storedAdvanced = parseAppearanceProfile(
        localStorage.getItem(APPEARANCE_PREFERENCES_STORAGE_KEY),
      );
      const advanced = sanitizeAdvancedInterfacePreferences(
        storedAdvanced ?? DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
      );
      advancedInterfacePreferencesRef.current = advanced;
      setAdvancedInterfacePreferencesState(advanced);
      const storedMotion = parseMotionProfile(localStorage.getItem(MOTION_PREFERENCES_STORAGE_KEY));
      const motion = sanitizeMotionPreferences(storedMotion ?? DEFAULT_MOTION_PREFERENCES);
      motionPreferencesRef.current = motion;
      setMotionPreferencesState(motion);
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key) {
        syncAllAppearanceState();
        return;
      }
      const value = event.newValue;
      switch (event.key) {
        case APPEARANCE_PREFERENCES_STORAGE_KEY: {
          const advanced = sanitizeAdvancedInterfacePreferences(
            parseAppearanceProfile(value) ?? DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
          );
          advancedInterfacePreferencesRef.current = advanced;
          setAdvancedInterfacePreferencesState(advanced);
          break;
        }
        case MOTION_PREFERENCES_STORAGE_KEY: {
          const motion = sanitizeMotionPreferences(
            parseMotionProfile(value) ?? DEFAULT_MOTION_PREFERENCES,
          );
          motionPreferencesRef.current = motion;
          setMotionPreferencesState(motion);
          break;
        }
        case 'app-theme':
          setThemeState(value === 'dark' ? 'dark' : 'light');
          break;
        case 'app-palette-style':
          setPaletteStyleState((value as PaletteStyle) || 'neutral');
          break;
        case 'app-black-mode':
          setBlackModeState(value === 'true');
          break;
        case 'app-color-theme':
          setColorThemeState((value as ColorTheme) || 'default');
          break;
        case 'app-surface-lift':
          setSurfaceLiftState(resolveSurfaceLift(value));
          break;
        case 'app-font-family':
          setFontFamilyState(resolveFontId(value));
          break;
        case 'app-font-display':
          setFontDisplayFamilyState(resolveFontId(value ?? DEFAULT_DISPLAY_FONT_ID));
          break;
        case 'app-font-size':
          setFontSizeState(resolveFontSize(value));
          break;
        case 'app-type-ratio':
          setTypeRatioState(resolveTypeRatio(value));
          break;
        case 'app-type-leading':
          setTypeLeadingState(resolveTypeLeading(value));
          break;
        case 'app-font-weight':
          setFontWeightState(clampFontWeight(Number(value ?? 400)));
          break;
        case 'app-font-opacity': {
          const opacity = Number(value ?? 1);
          setFontOpacityState(Number.isFinite(opacity) ? opacity : 1);
          break;
        }
        case 'app-corner-softness':
          setCornerSoftnessState(clampCornerSoftness(Number(value ?? 1)));
          break;
        case 'app-ui-density':
          setUiDensityState(resolveDensity(value));
          break;
        case 'app-content-width':
          setContentWidthState(resolveWidth(value));
          break;
        case 'app-border-strength':
          setBorderStrengthState(resolveBorder(value));
          break;
        case 'app-motion-speed': {
          const speed = Number(value ?? 1);
          setMotionSpeedState(Number.isFinite(speed) && speed > 0 ? speed : 1);
          break;
        }
        case 'app-motion-amplitude': {
          const amplitude = Number(value ?? 1);
          setMotionAmplitudeState(Number.isFinite(amplitude) && amplitude >= 0 ? amplitude : 1);
          break;
        }
        case 'app-spring-bounce': {
          const bounce = Number(value ?? 0);
          setSpringBounceState(Number.isFinite(bounce) && bounce >= 0 ? bounce : 0);
          break;
        }
        case 'app-fps-cap':
          setFpsCapState(
            value === '60' || value === '90' || value === '120'
              ? (Number(value) as FpsCap)
              : 'auto',
          );
          break;
        default:
          break;
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const t = useCallback((key: string): string => translate(language, key), [language]);
  const dir = 'rtl';

  // The token swap must never look like a stutter.
  //
  // Two strategies, in order of preference:
  //
  //   1. View Transitions — the browser snapshots the old frame, we mutate the
  //      tokens, and the compositor cross-fades two textures. One GPU layer,
  //      zero per-element style work, so a 3000-node screen costs the same as
  //      an empty one. This is what removes the hitch.
  //   2. `.theme-transition` — the legacy per-element colour transition, used
  //      only where View Transitions are unavailable.
  //
  // Either way it must NOT run on the first paint — doing so made the whole
  // app visibly "melt in" on every cold boot, and fought the entrance
  // animations.
  const themeReadyRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const isFirstPaint = !themeReadyRef.current;
    themeReadyRef.current = true;

    const applyTheme = () => {
      const isDark = theme === 'dark';
      root.classList.toggle('dark', isDark);
      root.dir = dir;
      root.lang = language;

      // Find preset and generate tokens
      let preset = themePresets.find((p) => p.id === colorTheme);
      if (!preset && colorTheme === 'dynamic') {
        try {
          const saved = localStorage.getItem('app-dynamic-preset');
          if (saved) preset = JSON.parse(saved);
        } catch {
          /* malformed preset - fall through to the first built-in */
        }
      }
      if (!preset) preset = themePresets[0];

      // Enforce the single unified Zen Elite design style
      root.removeAttribute('data-md3');
      root.setAttribute('data-design-mode', 'classic');
      const tokens = generateThemeTokens(
        preset,
        paletteStyle as ThemeStyle,
        isDark,
        isDark && blackMode,
        surfaceLift,
      );
      applyThemeTokens(tokens);
    };

    if (isFirstPaint) {
      applyTheme();
      return;
    }

    const reduced =
      root.dataset.reducedMotion === 'true' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      applyTheme();
      return;
    }

    type VTDocument = Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    const startViewTransition = (document as VTDocument).startViewTransition;

    if (typeof startViewTransition === 'function') {
      // The class is what scopes the cross-fade keyframes in index.css, so it
      // has to be on the element BEFORE the snapshot is taken, and can only
      // come off once the transition has actually finished.
      root.classList.add('theme-view-transition');
      let cancelled = false;
      const transition = startViewTransition.call(document, applyTheme);
      void transition.finished
        .catch(() => {
          /* a superseding transition skipped this one — nothing to clean up */
        })
        .finally(() => {
          if (!cancelled) root.classList.remove('theme-view-transition');
        });
      return () => {
        cancelled = true;
        root.classList.remove('theme-view-transition');
      };
    }

    root.classList.add('theme-transition');
    applyTheme();

    // Keep in sync with the 200ms transition declared in index.css.
    const timeout = setTimeout(() => root.classList.remove('theme-transition'), 240);

    return () => {
      clearTimeout(timeout);
      root.classList.remove('theme-transition');
    };
  }, [theme, dir, language, paletteStyle, blackMode, colorTheme, surfaceLift]);

  // Apply typography. All resolution and scale maths live in src/lib/fonts.ts
  // so the settings screen and this provider can never disagree about what a
  // font id — or a scale ratio — means.
  //
  // Keep the root at 16px so rem-based layout remains stable. Typography size
  // preferences are expressed through the generated type tokens instead.
  useEffect(() => {
    const root = document.documentElement;
    const { vars, rootWeight } = typographyTokens({
      bodyFont: fontFamily,
      displayFont: fontDisplayFamily,
      size: fontSize,
      ratio: typeRatio,
      leading: typeLeading,
      weight: fontWeight,
      opacity: fontOpacity,
    });
    applyCssVars(vars);
    root.style.fontSize = '16px';
    root.style.fontWeight = rootWeight;
  }, [fontFamily, fontDisplayFamily, fontSize, typeRatio, typeLeading, fontWeight, fontOpacity]);

  // Apply interface geometry — corners, density, column width, hairlines.
  // Every shared utility in index.css reads these variables, so this single
  // effect reshapes the entire app.
  useEffect(() => {
    applyCssVars(
      interfaceTokens({
        cornerSoftness,
        density: uiDensity,
        width: contentWidth,
        border: borderStrength,
        surfaceLift,
        uiScale,
        adaptiveLayout,
        surfaceMaterial,
        interactionStyle,
        reducedTransparency,
        strongerContrast,
        largeTouchTargets,
        clearerFocus,
        spacingScale,
        radiusProfile,
        borderWidth,
        dividerStyle,
        iconWeightScale,
        rowIconScale,
        focusOffset,
        pressDepth,
        tapTargetMin,
        contentWidthCustom,
        headerScale,
        scrollbarStyle,
        safeAreaExtra,
      }),
    );
  }, [
    cornerSoftness,
    uiDensity,
    contentWidth,
    borderStrength,
    surfaceLift,
    uiScale,
    adaptiveLayout,
    surfaceMaterial,
    interactionStyle,
    reducedTransparency,
    strongerContrast,
    largeTouchTargets,
    clearerFocus,
    spacingScale,
    radiusProfile,
    borderWidth,
    dividerStyle,
    iconWeightScale,
    rowIconScale,
    focusOffset,
    pressDepth,
    tapTargetMin,
    contentWidthCustom,
    headerScale,
    scrollbarStyle,
    safeAreaExtra,
  ]);

  // ── Motion platform ────────────────────────────────────────────────
  //
  // Each effect owns exactly one runtime concern. They are deliberately
  // separate rather than one combined effect so that changing, say, the
  // overlay character does not re-run the speed recomputation.

  // Speed scale — mutates the MOTION/motionWeight/DURATION baselines and
  // publishes --motion-scale, which every CSS duration multiplies by.
  useEffect(() => {
    applyMotionSpeed(motionSpeed);
  }, [motionSpeed]);

  // Screen-transition-only duration multiplier.
  useEffect(() => {
    applyNavDuration(navDuration);
  }, [navDuration]);

  // Amplitude (translate distance + push/pop parallax).
  useEffect(() => {
    applyMotionAmplitude(motionAmplitude);
  }, [motionAmplitude]);

  // Spring bounce (damping ratio).
  useEffect(() => {
    applyMotionBounce(springBounce);
  }, [springBounce]);

  // The curve family framer-motion AND the stylesheet both read.
  useEffect(() => {
    applyEasingProfile(easingProfile);
  }, [easingProfile]);

  // Entrance cadence for every page that uses pageStagger/pageItem.
  useEffect(() => {
    applyListStagger(listStagger);
  }, [listStagger]);

  // How much of the press response is expressed.
  useEffect(() => {
    applyPressFeedback(pressFeedback);
  }, [pressFeedback]);

  // Navigation character — read by buildNavVariants and by CSS.
  useEffect(() => {
    applyNavStyle(navStyle);
  }, [navStyle]);

  // Transient-surface character — neutralises the bouncy pop when set to fade.
  useEffect(() => {
    applyOverlayStyle(overlayStyle);
  }, [overlayStyle]);

  // Scroll behaviour plus the fling governor.
  useEffect(() => {
    applyScrollProfile(scrollProfile);
  }, [scrollProfile]);

  // In-app reduced motion, OR-ed with the OS preference inside the runtime.
  useEffect(() => {
    applyReduceMotion(reduceMotion);
  }, [reduceMotion]);

  // GPU layer promotion.
  useEffect(() => {
    applyCompositorHints(compositorHints);
  }, [compositorHints]);

  // The adaptive governor that degrades motion under sustained frame loss.
  useEffect(() => {
    installPerfGovernor(adaptivePerformance);
  }, [adaptivePerformance]);

  // Install / refresh the global rAF cap, and tell the frame monitor which
  // budget to measure against. When the cap is 'auto' the budget is the panel's
  // own refresh rate, so "60 of 60" on a 60 Hz screen reads as healthy rather
  // than as half the frames being missed.
  useEffect(() => {
    installFpsCap(fpsCap === 'auto' ? null : fpsCap);
    if (fpsCap === 'auto') {
      const known = getNativeHz();
      if (known !== null) setFrameBudgetHz(known);
      else void measureDisplayHz().then(setFrameBudgetHz);
    } else {
      setFrameBudgetHz(fpsCap);
    }
    return () => {
      /* keep cap across unmount — provider lives for the app lifetime */
    };
  }, [fpsCap]);

  const value = useMemo<AppContextType>(
    () => ({
      language,
      setLanguage,
      theme,
      setTheme,
      t,
      dir,
      paletteStyle,
      setPaletteStyle,
      colorTheme,
      setColorTheme,
      blackMode,
      setBlackMode,
      surfaceLift,
      setSurfaceLift,
      fontFamily,
      setFontFamily,
      fontDisplayFamily,
      setFontDisplayFamily,
      fontSize,
      setFontSize,
      typeRatio,
      setTypeRatio,
      typeLeading,
      setTypeLeading,
      fontWeight,
      setFontWeight,
      fontOpacity,
      setFontOpacity,
      cornerSoftness,
      setCornerSoftness,
      uiDensity,
      setUiDensity,
      contentWidth,
      setContentWidth,
      borderStrength,
      setBorderStrength,
      uiScale,
      setUiScale,
      adaptiveLayout,
      setAdaptiveLayout,
      surfaceMaterial,
      setSurfaceMaterial,
      interactionStyle,
      setInteractionStyle,
      reducedTransparency,
      setReducedTransparency,
      strongerContrast,
      setStrongerContrast,
      largeTouchTargets,
      setLargeTouchTargets,
      clearerFocus,
      setClearerFocus,
      spacingScale,
      setSpacingScale,
      radiusProfile,
      setRadiusProfile,
      borderWidth,
      setBorderWidth,
      dividerStyle,
      setDividerStyle,
      iconWeightScale,
      setIconWeightScale,
      rowIconScale,
      setRowIconScale,
      focusOffset,
      setFocusOffset,
      pressDepth,
      setPressDepth,
      tapTargetMin,
      setTapTargetMin,
      contentWidthCustom,
      setContentWidthCustom,
      headerScale,
      setHeaderScale,
      scrollbarStyle,
      setScrollbarStyle,
      safeAreaExtra,
      setSafeAreaExtra,
      applyAdvancedInterfacePreferences,
      resetInterfacePreferences,
      prayerMadhab,
      setPrayerMadhab,
      midnightMode,
      setMidnightMode,
      latitudeAdjMethod,
      setLatitudeAdjMethod,
      dstEnabled,
      setDstEnabled,
      calcMethod,
      setCalcMethod,
      motionSpeed,
      setMotionSpeed,
      fpsCap,
      setFpsCap,
      motionAmplitude,
      setMotionAmplitude,
      springBounce,
      setSpringBounce,
      navStyle,
      setNavStyle,
      easingProfile,
      setEasingProfile,
      scrollProfile,
      setScrollProfile: setScrollProfileSetting,
      overlayStyle,
      setOverlayStyle,
      navDuration,
      setNavDuration,
      listStagger,
      setListStagger,
      pressFeedback,
      setPressFeedback,
      reduceMotion,
      setReduceMotion,
      gestureBack,
      setGestureBack,
      gestureSensitivity,
      setGestureSensitivity,
      adaptivePerformance,
      setAdaptivePerformance,
      compositorHints,
      setCompositorHints,
      applyMotionPreferences,
      applyMotionPreset,
      resetMotionPreferences,
    }),
    [
      language,
      setLanguage,
      theme,
      setTheme,
      t,
      dir,
      paletteStyle,
      setPaletteStyle,
      colorTheme,
      setColorTheme,
      blackMode,
      setBlackMode,
      surfaceLift,
      setSurfaceLift,
      fontFamily,
      setFontFamily,
      fontDisplayFamily,
      setFontDisplayFamily,
      fontSize,
      setFontSize,
      typeRatio,
      setTypeRatio,
      typeLeading,
      setTypeLeading,
      fontWeight,
      setFontWeight,
      fontOpacity,
      setFontOpacity,
      cornerSoftness,
      setCornerSoftness,
      uiDensity,
      setUiDensity,
      contentWidth,
      setContentWidth,
      borderStrength,
      setBorderStrength,
      uiScale,
      setUiScale,
      adaptiveLayout,
      setAdaptiveLayout,
      surfaceMaterial,
      setSurfaceMaterial,
      interactionStyle,
      setInteractionStyle,
      reducedTransparency,
      setReducedTransparency,
      strongerContrast,
      setStrongerContrast,
      largeTouchTargets,
      setLargeTouchTargets,
      clearerFocus,
      setClearerFocus,
      spacingScale,
      setSpacingScale,
      radiusProfile,
      setRadiusProfile,
      borderWidth,
      setBorderWidth,
      dividerStyle,
      setDividerStyle,
      iconWeightScale,
      setIconWeightScale,
      rowIconScale,
      setRowIconScale,
      focusOffset,
      setFocusOffset,
      pressDepth,
      setPressDepth,
      tapTargetMin,
      setTapTargetMin,
      contentWidthCustom,
      setContentWidthCustom,
      headerScale,
      setHeaderScale,
      scrollbarStyle,
      setScrollbarStyle,
      safeAreaExtra,
      setSafeAreaExtra,
      applyAdvancedInterfacePreferences,
      resetInterfacePreferences,
      prayerMadhab,
      setPrayerMadhab,
      midnightMode,
      setMidnightMode,
      latitudeAdjMethod,
      setLatitudeAdjMethod,
      dstEnabled,
      setDstEnabled,
      calcMethod,
      setCalcMethod,
      motionSpeed,
      setMotionSpeed,
      fpsCap,
      setFpsCap,
      motionAmplitude,
      setMotionAmplitude,
      springBounce,
      setSpringBounce,
      navStyle,
      setNavStyle,
      easingProfile,
      setEasingProfile,
      scrollProfile,
      setScrollProfileSetting,
      overlayStyle,
      setOverlayStyle,
      navDuration,
      setNavDuration,
      listStagger,
      setListStagger,
      pressFeedback,
      setPressFeedback,
      reduceMotion,
      setReduceMotion,
      gestureBack,
      setGestureBack,
      gestureSensitivity,
      setGestureSensitivity,
      adaptivePerformance,
      setAdaptivePerformance,
      compositorHints,
      setCompositorHints,
      applyMotionPreferences,
      applyMotionPreset,
      resetMotionPreferences,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
