import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@supabase/supabase-js';
import { themePresets, generateThemeTokens, applyThemeTokens, type ThemeStyle } from '@/utils/themeEngine';
import { translate, type Language } from '@/i18n';

// 'system' was intentionally removed from the public theme API — users
// pick Light or Dark explicitly. Any stale localStorage value is
// migrated to 'light' on read below.
type Theme = 'light' | 'dark';
type PaletteStyle = 'tonal' | 'vibrant' | 'expressive' | 'neutral' | 'rainbow';
type ColorTheme = 'paper' | 'default' | 'midnight' | 'rose' | 'emerald' | 'lavender' | 'sunset' | 'ocean' | 'neon' | 'coffee' | 'mono' | 'cherry' | 'gold' | 'aurora' | 'sakura' | 'arctic' | 'volcano' | 'matcha' | 'nebula' | 'copper' | 'mint' | 'sandstone' | 'dusk' | 'moss' | 'clay' | 'storm' | 'silk' | 'amber' | 'fog' | 'obsidian' | 'terracotta' | 'dynamic';

type PrayerMadhab = 'shafii' | 'hanafi' | 'hanbali' | 'maliki';
type LatitudeAdjMethod = 'middle' | 'seventh' | 'angle';
/** 'auto' = pick per-country; otherwise an explicit Aladhan method id (Sunni-only). */
type CalcMethod = 'auto' | number;

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  accentHue: number;
  setAccentHue: (hue: number) => void;
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
}


const AppContext = createContext<AppContextType | undefined>(undefined);

// How long to wait before flushing settings to the database after a setting
// change. Multiple rapid changes coalesce into a single upsert.
const SAVE_DEBOUNCE_MS = 400;

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    (localStorage.getItem('app-language') as Language) || 'ar'
  );
  const [theme, setThemeState] = useState<Theme>(() => {
    const raw = localStorage.getItem('app-theme');
    return raw === 'dark' ? 'dark' : 'light';
  });
  const [accentHue, setAccentHueState] = useState<number>(() =>
    parseInt(localStorage.getItem('app-accent-hue') || '152', 10)
  );
  const [paletteStyle, setPaletteStyleState] = useState<PaletteStyle>(() =>
    (localStorage.getItem('app-palette-style') as PaletteStyle) || 'vibrant'
  );
  const [blackMode, setBlackModeState] = useState<boolean>(() =>
    localStorage.getItem('app-black-mode') === 'true'
  );
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() =>
    (localStorage.getItem('app-color-theme') as ColorTheme) || 'paper'
  );
  const [fontFamily, setFontFamilyState] = useState<string>(() =>
    localStorage.getItem('app-font-family') || 'plex-mono'
  );
  const [fontSize, setFontSizeState] = useState<string>(() =>
    localStorage.getItem('app-font-size') || 'medium'
  );
  const [fontWeight, setFontWeightState] = useState<number>(() =>
    parseInt(localStorage.getItem('app-font-weight') || '400', 10)
  );
  const [fontOpacity, setFontOpacityState] = useState<number>(() =>
    parseFloat(localStorage.getItem('app-font-opacity') || '1')
  );
  const [prayerMadhab, setPrayerMadhabState] = useState<PrayerMadhab>(() =>
    (localStorage.getItem('app-prayer-madhab') as PrayerMadhab) || 'shafii'
  );
  const [midnightMode, setMidnightModeState] = useState<number>(() =>
    parseInt(localStorage.getItem('app-midnight-mode') || '0', 10)
  );
  const [latitudeAdjMethod, setLatitudeAdjMethodState] = useState<LatitudeAdjMethod>(() =>
    (localStorage.getItem('app-lat-adj-method') as LatitudeAdjMethod) || 'angle'
  );
  const [dstEnabled, setDstEnabledState] = useState<boolean>(() =>
    localStorage.getItem('app-dst-enabled') !== 'false'
  );
  const [calcMethod, setCalcMethodState] = useState<CalcMethod>(() => {
    const raw = localStorage.getItem('app-calc-method');
    if (!raw || raw === 'auto') return 'auto';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 'auto';
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
    'game-stats', 'saved-locations', 'lastLocation',
    'mihrab:lastTab', 'wellness:lastTab', 'wellness:onboarded',
    'tafsir-state', 'reading:state', 'rss:lastFeed',
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
    } catch { /* storage may be blocked in private mode — ignore */ }
    FEATURE_SCRATCH_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch {} });

    // Re-seed default values + state.
    setLanguageState('ar'); localStorage.setItem('app-language', 'ar');
    setThemeState('light'); localStorage.setItem('app-theme', 'light');
    setAccentHueState(152); localStorage.setItem('app-accent-hue', '152');
    setPaletteStyleState('vibrant'); localStorage.setItem('app-palette-style', 'vibrant');
    setBlackModeState(false); localStorage.setItem('app-black-mode', 'false');
    setColorThemeState('paper'); localStorage.setItem('app-color-theme', 'paper');
    setFontFamilyState('plex-mono'); localStorage.setItem('app-font-family', 'plex-mono');
    setFontSizeState('medium'); localStorage.setItem('app-font-size', 'medium');
    setFontWeightState(400); localStorage.setItem('app-font-weight', '400');
    setFontOpacityState(1); localStorage.setItem('app-font-opacity', '1');
    setPrayerMadhabState('shafii'); localStorage.setItem('app-prayer-madhab', 'shafii');
    setMidnightModeState(0); localStorage.setItem('app-midnight-mode', '0');
    setLatitudeAdjMethodState('angle'); localStorage.setItem('app-lat-adj-method', 'angle');
    setDstEnabledState(true); localStorage.setItem('app-dst-enabled', 'true');
    setCalcMethodState('auto'); localStorage.setItem('app-calc-method', 'auto');
    setTimeout(() => { syncRef.current = false; }, 100);
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
        if (s.language) { setLanguageState(s.language); localStorage.setItem('app-language', s.language); }
        if (s.theme) { setThemeState(s.theme); localStorage.setItem('app-theme', s.theme); }
        if (s.accentHue !== undefined) { setAccentHueState(s.accentHue); localStorage.setItem('app-accent-hue', String(s.accentHue)); }
        if (s.paletteStyle) { setPaletteStyleState(s.paletteStyle); localStorage.setItem('app-palette-style', s.paletteStyle); }
        if (s.blackMode !== undefined) { setBlackModeState(s.blackMode); localStorage.setItem('app-black-mode', String(s.blackMode)); }
        if (s.colorTheme) { setColorThemeState(s.colorTheme); localStorage.setItem('app-color-theme', s.colorTheme); }
        if (s.fontFamily) { setFontFamilyState(s.fontFamily); localStorage.setItem('app-font-family', s.fontFamily); }
        if (s.fontSize) { setFontSizeState(s.fontSize); localStorage.setItem('app-font-size', s.fontSize); }
        if (s.fontWeight !== undefined) { setFontWeightState(s.fontWeight); localStorage.setItem('app-font-weight', String(s.fontWeight)); }
        if (s.fontOpacity !== undefined) { setFontOpacityState(s.fontOpacity); localStorage.setItem('app-font-opacity', String(s.fontOpacity)); }
        if (s.prayerMadhab) { setPrayerMadhabState(s.prayerMadhab); localStorage.setItem('app-prayer-madhab', s.prayerMadhab); }
        if (s.midnightMode !== undefined) { setMidnightModeState(s.midnightMode); localStorage.setItem('app-midnight-mode', String(s.midnightMode)); }
        if (s.latitudeAdjMethod) { setLatitudeAdjMethodState(s.latitudeAdjMethod); localStorage.setItem('app-lat-adj-method', s.latitudeAdjMethod); }
        if (s.dstEnabled !== undefined) { setDstEnabledState(s.dstEnabled); localStorage.setItem('app-dst-enabled', String(s.dstEnabled)); }
        if (s.calcMethod !== undefined) {
          const cm: CalcMethod = s.calcMethod === 'auto' ? 'auto' : Number(s.calcMethod);
          setCalcMethodState(cm);
          localStorage.setItem('app-calc-method', String(cm));
        }
        // Also load game stats and locations if stored
        if (s.gameStats) localStorage.setItem('game-stats', JSON.stringify(s.gameStats));
        if (s.savedLocations) localStorage.setItem('saved-locations', JSON.stringify(s.savedLocations));
        setTimeout(() => { syncRef.current = false; }, 100);
      }
      initialLoadDone.current = true;
    };
    load();
  }, [authUser]);

  // Save settings to DB when they change.
  // Wrapped in a coalescing debounce so that rapid changes (e.g. user dragging
  // a slider, or toggling several settings in quick succession) flush as a
  // single upsert instead of N parallel ones.
  const flushSaveToDb = async () => {
    saveTimerRef.current = null;
    const user = authUserRef.current;
    if (!user || syncRef.current || !initialLoadDone.current) return;
    const settings: Record<string, any> = {
      language: localStorage.getItem('app-language'),
      theme: localStorage.getItem('app-theme'),
      accentHue: parseInt(localStorage.getItem('app-accent-hue') || '152', 10),
      paletteStyle: localStorage.getItem('app-palette-style'),
      blackMode: localStorage.getItem('app-black-mode') === 'true',
      colorTheme: localStorage.getItem('app-color-theme') || 'default',
      fontFamily: localStorage.getItem('app-font-family') || 'default',
      fontSize: localStorage.getItem('app-font-size') || 'medium',
      fontWeight: parseInt(localStorage.getItem('app-font-weight') || '400', 10),
      fontOpacity: parseFloat(localStorage.getItem('app-font-opacity') || '1'),
      prayerMadhab: localStorage.getItem('app-prayer-madhab') || 'shafii',
      midnightMode: parseInt(localStorage.getItem('app-midnight-mode') || '0', 10),
      latitudeAdjMethod: localStorage.getItem('app-lat-adj-method') || 'angle',
      dstEnabled: localStorage.getItem('app-dst-enabled') !== 'false',
      calcMethod: (localStorage.getItem('app-calc-method') ?? 'auto'),
    };
    // Also save game stats and locations
    try { settings.gameStats = JSON.parse(localStorage.getItem('game-stats') || '{}'); } catch { /* noop */ }
    try { settings.savedLocations = JSON.parse(localStorage.getItem('saved-locations') || '[]'); } catch { /* noop */ }

    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, settings: settings as any }, { onConflict: 'user_id' });
  };

  const scheduleSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSaveToDb, SAVE_DEBOUNCE_MS);
  };

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
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
    scheduleSave();
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
    scheduleSave();
  };

  const setAccentHue = (hue: number) => {
    setAccentHueState(hue);
    localStorage.setItem('app-accent-hue', hue.toString());
    scheduleSave();
  };

  const setPaletteStyle = (style: PaletteStyle) => {
    setPaletteStyleState(style);
    localStorage.setItem('app-palette-style', style);
    scheduleSave();
  };

  const setBlackMode = (v: boolean) => {
    setBlackModeState(v);
    localStorage.setItem('app-black-mode', v.toString());
    scheduleSave();
  };

  const setColorTheme = (ct: ColorTheme) => {
    setColorThemeState(ct);
    localStorage.setItem('app-color-theme', ct);
    scheduleSave();
  };

  const setFontFamily = (f: string) => {
    setFontFamilyState(f);
    localStorage.setItem('app-font-family', f);
    scheduleSave();
  };

  const setFontSize = (s: string) => {
    setFontSizeState(s);
    localStorage.setItem('app-font-size', s);
    scheduleSave();
  };

  const setFontWeight = (w: number) => {
    setFontWeightState(w);
    localStorage.setItem('app-font-weight', String(w));
    scheduleSave();
  };

  const setFontOpacity = (o: number) => {
    setFontOpacityState(o);
    localStorage.setItem('app-font-opacity', String(o));
    scheduleSave();
  };

  const setPrayerMadhab = (m: PrayerMadhab) => {
    setPrayerMadhabState(m);
    localStorage.setItem('app-prayer-madhab', m);
    scheduleSave();
  };

  const setMidnightMode = (m: number) => {
    setMidnightModeState(m);
    localStorage.setItem('app-midnight-mode', String(m));
    scheduleSave();
  };

  const setLatitudeAdjMethod = (m: LatitudeAdjMethod) => {
    setLatitudeAdjMethodState(m);
    localStorage.setItem('app-lat-adj-method', m);
    scheduleSave();
  };

  const setDstEnabled = (v: boolean) => {
    setDstEnabledState(v);
    localStorage.setItem('app-dst-enabled', String(v));
    scheduleSave();
  };

  const setCalcMethod = (m: CalcMethod) => {
    setCalcMethodState(m);
    localStorage.setItem('app-calc-method', String(m));
    scheduleSave();
  };

  const t = (key: string): string => translate(language, key);
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');

    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    root.dir = dir;
    root.lang = language;

    // Find preset and generate tokens
    let preset = themePresets.find(p => p.id === colorTheme);
    if (!preset && colorTheme === 'dynamic') {
      try {
        const saved = localStorage.getItem('app-dynamic-preset');
        if (saved) preset = JSON.parse(saved);
      } catch {}
    }
    if (!preset) preset = themePresets[0];

    // Single canonical palette engine — MD3 mode retired.
    root.removeAttribute('data-md3');
    const tokens = generateThemeTokens(preset, paletteStyle as ThemeStyle, isDark, isDark && blackMode);
    applyThemeTokens(tokens);

    const timeout = setTimeout(() => root.classList.remove('theme-transition'), 600);

    return () => clearTimeout(timeout);
  }, [theme, dir, language, accentHue, paletteStyle, blackMode, colorTheme]);

  // Apply font family, size, weight & opacity
  useEffect(() => {
    const fontMap: Record<string, string> = {
      default: "'IBM Plex Mono', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', system-ui, -apple-system, monospace",
      'plex-mono': "'IBM Plex Mono', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', system-ui, -apple-system, monospace",
      inter: "'Inter', 'Noto Sans Arabic', system-ui, -apple-system, sans-serif",
      cairo: "'Cairo', 'Inter', system-ui, -apple-system, sans-serif",
      tajawal: "'Tajawal', 'Inter', system-ui, -apple-system, sans-serif",
      'ibm-plex': "'IBM Plex Sans Arabic', 'Inter', system-ui, -apple-system, sans-serif",
      readex: "'Readex Pro', 'Inter', system-ui, -apple-system, sans-serif",
    };
    const sizeMap: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
    const ff = fontMap[fontFamily] || fontMap.default;
    document.documentElement.style.setProperty('--font-display', ff);
    document.documentElement.style.setProperty('--font-body', ff);
    document.documentElement.style.fontSize = sizeMap[fontSize] || '16px';
    document.documentElement.style.fontWeight = String(fontWeight);
    document.documentElement.style.setProperty('--text-opacity', String(fontOpacity));
  }, [fontFamily, fontSize, fontWeight, fontOpacity]);

  return (
    <AppContext.Provider value={{ language, setLanguage, theme, setTheme, t, dir, accentHue, setAccentHue, paletteStyle, setPaletteStyle, colorTheme, setColorTheme, blackMode, setBlackMode, fontFamily, setFontFamily, fontSize, setFontSize, fontWeight, setFontWeight, fontOpacity, setFontOpacity, prayerMadhab, setPrayerMadhab, midnightMode, setMidnightMode, latitudeAdjMethod, setLatitudeAdjMethod, dstEnabled, setDstEnabled, calcMethod, setCalcMethod }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
