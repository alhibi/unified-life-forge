import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type Language = 'ar' | 'de';
type Theme = 'light' | 'dark' | 'system';
type PaletteStyle = 'tonal' | 'vibrant' | 'expressive' | 'neutral' | 'rainbow';
type ColorTheme = 'default' | 'midnight' | 'rose' | 'emerald' | 'lavender' | 'sunset' | 'ocean' | 'neon' | 'coffee' | 'mono';

type PrayerMadhab = 'shafii' | 'hanafi' | 'hanbali' | 'maliki';
type LatitudeAdjMethod = 'middle' | 'seventh' | 'angle';

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
}

const translations: Record<string, Record<Language, string>> = {
  'app.title': { ar: 'تطبيقي الذكي', de: 'Meine Smart App' },
  'greeting.morning': { ar: 'صباح الخير', de: 'Guten Morgen' },
  'greeting.afternoon': { ar: 'نهارك جميل', de: 'Guten Tag' },
  'greeting.evening': { ar: 'مساء الخير', de: 'Guten Abend' },
  'nav.home': { ar: 'الرئيسية', de: 'Start' },
  'nav.games': { ar: 'الألعاب', de: 'Spiele' },
  'nav.settings': { ar: 'الإعدادات', de: 'Einstellungen' },
  'nav.duas': { ar: 'الأدعية', de: 'Bittgebete' },
  'nav.diwan': { ar: 'ديوان', de: 'Diwan' },
  'calendar.title': { ar: 'التقويم', de: 'Kalender' },
  'calendar.today': { ar: 'اليوم', de: 'Heute' },
  'calendar.hijri': { ar: 'هجري', de: 'Hijri' },
  'calendar.gregorian': { ar: 'ميلادي', de: 'Gregorianisch' },
  'audio.title': { ar: 'مشغل الصوت', de: 'Audio-Player' },
  'audio.select': { ar: 'اختر ملفاً صوتياً', de: 'Audiodatei auswählen' },
  'audio.noFile': { ar: 'لم يتم اختيار ملف', de: 'Keine Datei ausgewählt' },
  'audio.playing': { ar: 'قيد التشغيل', de: 'Wird abgespielt' },
  'audio.paused': { ar: 'متوقف', de: 'Pausiert' },
  'location.title': { ar: 'حفظ الموقع', de: 'Standort speichern' },
  'location.save': { ar: 'حفظ موقعي الحالي', de: 'Aktuellen Standort speichern' },
  'location.saved': { ar: 'المواقع المحفوظة', de: 'Gespeicherte Standorte' },
  'location.empty': { ar: 'لا توجد مواقع محفوظة', de: 'Keine gespeicherten Standorte' },
  'location.description': { ar: 'الوصف', de: 'Beschreibung' },
  'location.label': { ar: 'العنوان', de: 'Bezeichnung' },
  'location.delete': { ar: 'حذف', de: 'Löschen' },
  'location.saving': { ar: 'جاري الحفظ...', de: 'Wird gespeichert...' },
  'location.lat': { ar: 'خط العرض', de: 'Breitengrad' },
  'location.lng': { ar: 'خط الطول', de: 'Längengrad' },
  'settings.title': { ar: 'الإعدادات', de: 'Einstellungen' },
  'settings.theme': { ar: 'المظهر', de: 'Erscheinungsbild' },
  'settings.light': { ar: 'فاتح', de: 'Hell' },
  'settings.dark': { ar: 'داكن', de: 'Dunkel' },
  'settings.language': { ar: 'اللغة', de: 'Sprache' },
  'settings.arabic': { ar: 'العربية', de: 'Arabisch' },
  'settings.german': { ar: 'الألمانية', de: 'Deutsch' },
  'settings.colors': { ar: 'الألوان', de: 'Farben' },
  'games.title': { ar: 'الألعاب', de: 'Spiele' },
  'games.sudoku': { ar: 'سودوكو', de: 'Sudoku' },
  'games.sudoku.desc': { ar: 'تحدي العقل الكلاسيكي', de: 'Das klassische Denkspiel' },
  'games.chess': { ar: 'شطرنج', de: 'Schach' },
  'games.chess.desc': { ar: 'شطرنج مبسط', de: 'Minimalistisches Schach' },
  'games.memory': { ar: 'أزواج الذاكرة', de: 'Memory Pairs' },
  'games.memory.desc': { ar: 'اختبر ذاكرتك بمطابقة الأيقونات', de: 'Trainiere dein Gedächtnis' },
  'games.minesweeper': { ar: 'كاسحة الألغام', de: 'Minesweeper' },
  'games.minesweeper.desc': { ar: 'تجنب الألغام المخفية', de: 'Vermeide die versteckten Minen' },
  'games.colormaze': { ar: 'متاهة الألوان', de: 'Farbenlabyrinth' },
  'games.colormaze.desc': { ar: 'لوّن كل مربع في المتاهة', de: 'Male jedes Feld im Labyrinth' },
  'games.pipes': { ar: 'الأنابيب', de: 'Rohre' },
  'games.pipes.desc': { ar: 'وصّل الأنابيب لبناء المسار الصحيح', de: 'Verbinde die Rohre zum richtigen Pfad' },
  'games.back': { ar: 'رجوع', de: 'Zurück' },
  'sudoku.new': { ar: 'لعبة جديدة', de: 'Neues Spiel' },
  'sudoku.easy': { ar: 'سهل', de: 'Leicht' },
  'sudoku.medium': { ar: 'متوسط', de: 'Mittel' },
  'sudoku.hard': { ar: 'صعب', de: 'Schwer' },
  'sudoku.check': { ar: 'تحقق', de: 'Prüfen' },
  'sudoku.hint': { ar: 'تلميح', de: 'Hinweis' },
  'sudoku.reset': { ar: 'إعادة', de: 'Zurücksetzen' },
  'sudoku.solved': { ar: '🎉 أحسنت! حللت اللغز', de: '🎉 Bravo! Rätsel gelöst' },
  'sudoku.errors': { ar: 'يوجد أخطاء', de: 'Es gibt Fehler' },
  'sudoku.timer': { ar: 'الوقت', de: 'Zeit' },
  'chess.white': { ar: 'الأبيض', de: 'Weiß' },
  'chess.black': { ar: 'الأسود', de: 'Schwarz' },
  'chess.turn': { ar: 'دور', de: 'Am Zug' },
  'chess.newGame': { ar: 'لعبة جديدة', de: 'Neues Spiel' },
  'chess.check': { ar: 'كش!', de: 'Schach!' },
  'chess.checkmate': { ar: 'كش ملك!', de: 'Schachmatt!' },
  'chess.captured': { ar: 'القطع المأسورة', de: 'Geschlagene Figuren' },
  'stats.title': { ar: 'الإحصائيات', de: 'Statistiken' },
  'stats.wins': { ar: 'فوز', de: 'Siege' },
  'stats.winRate': { ar: 'نسبة الفوز', de: 'Siegquote' },
  'stats.streak': { ar: 'أفضل سلسلة', de: 'Beste Serie' },
  'stats.best': { ar: 'أفضل وقت', de: 'Bestzeit' },
  'stats.played': { ar: 'مباريات', de: 'Spiele' },
  'stats.moves': { ar: 'نقلات', de: 'Züge' },
  'location.openMap': { ar: 'فتح الخريطة', de: 'Karte öffnen' },
  'audio.selectFolder': { ar: 'اختر مجلد الموسيقى', de: 'Musikordner auswählen' },
  'calendar.daysLeft': { ar: 'يوم متبقي', de: 'Tage übrig' },
  'calendar.daysAgo': { ar: 'يوم مضى', de: 'Tage her' },
  'calendar.isToday': { ar: 'هذا هو اليوم!', de: 'Das ist heute!' },
  'calendar.tomorrow': { ar: 'غداً', de: 'Morgen' },
  'calendar.yesterday': { ar: 'أمس', de: 'Gestern' },
  'audio.selectHint': { ar: 'اختر مجلداً لعرض جميع الملفات الصوتية', de: 'Wähle einen Ordner um alle Audiodateien anzuzeigen' },
  'months.1': { ar: 'يناير', de: 'Januar' },
  'months.2': { ar: 'فبراير', de: 'Februar' },
  'months.3': { ar: 'مارس', de: 'März' },
  'months.4': { ar: 'أبريل', de: 'April' },
  'months.5': { ar: 'مايو', de: 'Mai' },
  'months.6': { ar: 'يونيو', de: 'Juni' },
  'months.7': { ar: 'يوليو', de: 'Juli' },
  'months.8': { ar: 'أغسطس', de: 'August' },
  'months.9': { ar: 'سبتمبر', de: 'September' },
  'months.10': { ar: 'أكتوبر', de: 'Oktober' },
  'months.11': { ar: 'نوفمبر', de: 'November' },
  'months.12': { ar: 'ديسمبر', de: 'Dezember' },
  'hijriMonths.1': { ar: 'محرم', de: 'Muharram' },
  'hijriMonths.2': { ar: 'صفر', de: 'Safar' },
  'hijriMonths.3': { ar: 'ربيع الأول', de: 'Rabīʿ al-Awwal' },
  'hijriMonths.4': { ar: 'ربيع الثاني', de: 'Rabīʿ ath-Thānī' },
  'hijriMonths.5': { ar: 'جمادى الأولى', de: 'Dschumādā l-Ūlā' },
  'hijriMonths.6': { ar: 'جمادى الآخرة', de: 'Dschumādā th-Thāniya' },
  'hijriMonths.7': { ar: 'رجب', de: 'Radschab' },
  'hijriMonths.8': { ar: 'شعبان', de: 'Schaʿbān' },
  'hijriMonths.9': { ar: 'رمضان', de: 'Ramadan' },
  'hijriMonths.10': { ar: 'شوال', de: 'Schawwāl' },
  'hijriMonths.11': { ar: 'ذو القعدة', de: 'Dhū l-Qaʿda' },
  'hijriMonths.12': { ar: 'ذو الحجة', de: 'Dhū l-Hiddscha' },
  'days.0': { ar: 'الأحد', de: 'So' },
  'days.1': { ar: 'الاثنين', de: 'Mo' },
  'days.2': { ar: 'الثلاثاء', de: 'Di' },
  'days.3': { ar: 'الأربعاء', de: 'Mi' },
  'days.4': { ar: 'الخميس', de: 'Do' },
  'days.5': { ar: 'الجمعة', de: 'Fr' },
  'days.6': { ar: 'السبت', de: 'Sa' },
  'daysShort.0': { ar: 'أح', de: 'So' },
  'daysShort.1': { ar: 'اث', de: 'Mo' },
  'daysShort.2': { ar: 'ثل', de: 'Di' },
  'daysShort.3': { ar: 'أر', de: 'Mi' },
  'daysShort.4': { ar: 'خم', de: 'Do' },
  'daysShort.5': { ar: 'جم', de: 'Fr' },
  'daysShort.6': { ar: 'سب', de: 'Sa' },
  // Prayer times
  'prayer.next': { ar: 'الصلاة القادمة', de: 'Nächstes Gebet' },
  'prayer.remaining': { ar: 'متبقي', de: 'verbleibend' },
  'prayer.hour': { ar: 'ساعة', de: 'Std' },
  'prayer.and': { ar: 'و', de: 'und' },
  'prayer.minute': { ar: 'دقيقة', de: 'Min' },
  'prayer.error': { ar: 'تعذر جلب مواقيت الصلاة', de: 'Gebetszeiten konnten nicht geladen werden' },
  'prayer.connectionError': { ar: 'تعذر الاتصال بالخادم', de: 'Verbindung zum Server fehlgeschlagen' },
  'prayer.fajr': { ar: 'الفجر', de: 'Fajr' },
  'prayer.dhuhr': { ar: 'الظهر', de: 'Dhuhr' },
  'prayer.asr': { ar: 'العصر', de: 'Asr' },
  'prayer.maghrib': { ar: 'المغرب', de: 'Maghrib' },
  'prayer.isha': { ar: 'العشاء', de: 'Isha' },
  'prayer.am': { ar: 'ص', de: 'AM' },
  'prayer.pm': { ar: 'م', de: 'PM' },
  // Islamic sections
  'sections.more': { ar: 'المزيد من', de: 'Mehr entdecken' },
  'sections.timedSunnah': { ar: 'سنن موقوتة', de: 'Zeitgebundene Sunna' },
  'sections.untimedSunnah': { ar: 'سنن غير موقوتة', de: 'Freiwillige Sunna' },
  'sections.propheticDay': { ar: 'اليوم النبوي', de: 'Prophetischer Tag' },
  'sections.quranVirtues': { ar: 'فضائل القرآن', de: 'Quran-Vorzüge' },
  'sections.selections': { ar: 'قطوف', de: 'Auswahl' },
  'sections.propheticBadges': { ar: 'الأوسمة النبوية', de: 'Prophetische Auszeichnungen' },
  // Timed Sunnah page
  'timed.title': { ar: 'السنن الموقوتة', de: 'Zeitgebundene Sunna' },
  'timed.sunnah': { ar: 'سنة', de: 'Sunna' },
  'timed.fajr': { ar: 'الفجر', de: 'Fajr' },
  'timed.beforeFajr': { ar: 'قبل الفجر', de: 'Vor Fajr' },
  'timed.dhuhr': { ar: 'الظهر', de: 'Dhuhr' },
  'timed.duha': { ar: 'الضحى', de: 'Duha' },
  'timed.asr': { ar: 'العصر', de: 'Asr' },
  'timed.maghrib': { ar: 'المغرب', de: 'Maghrib' },
  'timed.isha': { ar: 'العشاء', de: 'Isha' },
  'timed.friday': { ar: 'يوم الجمعة', de: 'Freitag' },
  // Sunnah detail
  'sunnah.sunnahs': { ar: 'السنن', de: 'Sunna-Handlungen' },
  'sunnah.sunnahUnit': { ar: 'سنة', de: 'Sunna' },
  'sunnah.copied': { ar: 'تم النسخ', de: 'Kopiert' },
  // Occasions
  'occasions.title': { ar: 'مناسبات دينية', de: 'Religiöse Anlässe' },
  'occasions.showAll': { ar: 'عرض الكل', de: 'Alle anzeigen' },
'occasions.today': { ar: 'اليوم', de: 'Heute' },
  'occasions.after': { ar: 'بعد', de: 'in' },
  'occasions.day': { ar: 'يوم', de: 'Tagen' },
  'occasions.past': { ar: 'مضت', de: 'Vergangen' },
  'occasions.upcoming': { ar: 'المناسبات القادمة', de: 'Kommende Anlässe' },
  'occasions.pastTitle': { ar: 'المناسبات الماضية', de: 'Vergangene Anlässe' },
  // Footer
  'footer.madeBy': { ar: 'صنع بواسطة', de: 'Erstellt von' },
  'footer.and': { ar: 'و', de: 'und' },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function applyAccentHue(_hue: number, _isDark: boolean, _palette: PaletteStyle) {
  // Using defaults from index.css
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    (localStorage.getItem('app-language') as Language) || 'ar'
  );
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem('app-theme') as Theme) || 'light'
  );
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
    (localStorage.getItem('app-color-theme') as ColorTheme) || 'default'
  );
  const [fontFamily, setFontFamilyState] = useState<string>(() =>
    localStorage.getItem('app-font-family') || 'default'
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

  const [authUser, setAuthUser] = useState<User | null>(null);
  const syncRef = useRef(false);
  const initialLoadDone = useRef(false);

  // Reset all state & localStorage to defaults
  const resetToDefaults = () => {
    syncRef.current = true;
    setLanguageState('ar'); localStorage.setItem('app-language', 'ar');
    setThemeState('light'); localStorage.setItem('app-theme', 'light');
    setAccentHueState(152); localStorage.setItem('app-accent-hue', '152');
    setPaletteStyleState('vibrant'); localStorage.setItem('app-palette-style', 'vibrant');
    setBlackModeState(false); localStorage.setItem('app-black-mode', 'false');
    setColorThemeState('default'); localStorage.setItem('app-color-theme', 'default');
    setFontFamilyState('default'); localStorage.setItem('app-font-family', 'default');
    setFontSizeState('medium'); localStorage.setItem('app-font-size', 'medium');
    setFontWeightState(400); localStorage.setItem('app-font-weight', '400');
    setFontOpacityState(1); localStorage.setItem('app-font-opacity', '1');
    setPrayerMadhabState('shafii'); localStorage.setItem('app-prayer-madhab', 'shafii');
    setMidnightModeState(0); localStorage.setItem('app-midnight-mode', '0');
    setLatitudeAdjMethodState('angle'); localStorage.setItem('app-lat-adj-method', 'angle');
    setDstEnabledState(true); localStorage.setItem('app-dst-enabled', 'true');
    localStorage.removeItem('game-stats');
    localStorage.removeItem('saved-locations');
    localStorage.removeItem('lastLocation');
    setTimeout(() => { syncRef.current = false; }, 100);
  };

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const prevUser = authUser;
      setAuthUser(session?.user ?? null);
      // Reset to defaults on logout
      if (event === 'SIGNED_OUT' || (!session?.user && prevUser)) {
        resetToDefaults();
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
        // Also load game stats and locations if stored
        if (s.gameStats) localStorage.setItem('game-stats', JSON.stringify(s.gameStats));
        if (s.savedLocations) localStorage.setItem('saved-locations', JSON.stringify(s.savedLocations));
        setTimeout(() => { syncRef.current = false; }, 100);
      }
      initialLoadDone.current = true;
    };
    load();
  }, [authUser]);

  // Save settings to DB when they change
  const saveToDb = async () => {
    if (!authUser || syncRef.current || !initialLoadDone.current) return;
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
    };
    // Also save game stats and locations
    try { settings.gameStats = JSON.parse(localStorage.getItem('game-stats') || '{}'); } catch {}
    try { settings.savedLocations = JSON.parse(localStorage.getItem('saved-locations') || '[]'); } catch {}

    await supabase
      .from('user_settings')
      .upsert({ user_id: authUser.id, settings: settings as any }, { onConflict: 'user_id' });
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
    setTimeout(saveToDb, 50);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
    setTimeout(saveToDb, 50);
  };

  const setAccentHue = (hue: number) => {
    setAccentHueState(hue);
    localStorage.setItem('app-accent-hue', hue.toString());
    setTimeout(saveToDb, 50);
  };

  const setPaletteStyle = (style: PaletteStyle) => {
    setPaletteStyleState(style);
    localStorage.setItem('app-palette-style', style);
    setTimeout(saveToDb, 50);
  };

  const setBlackMode = (v: boolean) => {
    setBlackModeState(v);
    localStorage.setItem('app-black-mode', v.toString());
    setTimeout(saveToDb, 50);
  };

  const setColorTheme = (ct: ColorTheme) => {
    setColorThemeState(ct);
    localStorage.setItem('app-color-theme', ct);
    setTimeout(saveToDb, 50);
  };

  const setFontFamily = (f: string) => {
    setFontFamilyState(f);
    localStorage.setItem('app-font-family', f);
    setTimeout(saveToDb, 50);
  };

  const setFontSize = (s: string) => {
    setFontSizeState(s);
    localStorage.setItem('app-font-size', s);
    setTimeout(saveToDb, 50);
  };

  const setFontWeight = (w: number) => {
    setFontWeightState(w);
    localStorage.setItem('app-font-weight', String(w));
    setTimeout(saveToDb, 50);
  };

  const setFontOpacity = (o: number) => {
    setFontOpacityState(o);
    localStorage.setItem('app-font-opacity', String(o));
    setTimeout(saveToDb, 50);
  };

  const setPrayerMadhab = (m: PrayerMadhab) => {
    setPrayerMadhabState(m);
    localStorage.setItem('app-prayer-madhab', m);
    setTimeout(saveToDb, 50);
  };

  const setMidnightMode = (m: number) => {
    setMidnightModeState(m);
    localStorage.setItem('app-midnight-mode', String(m));
    setTimeout(saveToDb, 50);
  };

  const setLatitudeAdjMethod = (m: LatitudeAdjMethod) => {
    setLatitudeAdjMethodState(m);
    localStorage.setItem('app-lat-adj-method', m);
    setTimeout(saveToDb, 50);
  };

  const setDstEnabled = (v: boolean) => {
    setDstEnabledState(v);
    localStorage.setItem('app-dst-enabled', String(v));
    setTimeout(saveToDb, 50);
  };

  const t = (key: string): string => translations[key]?.[language] || key;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    // Enable smooth theme transition
    root.classList.add('theme-transition');

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);
    root.classList.toggle('dark', isDark);
    root.classList.toggle('black-mode', isDark && blackMode);
    root.setAttribute('data-color-theme', colorTheme);
    root.dir = dir;
    root.lang = language;
    applyAccentHue(accentHue, isDark, paletteStyle);

    // Remove transition class after animation completes to avoid interfering with other transitions
    const timeout = setTimeout(() => root.classList.remove('theme-transition'), 600);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches);
        document.documentElement.classList.toggle('black-mode', e.matches && blackMode);
        applyAccentHue(accentHue, e.matches, paletteStyle);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme, dir, language, accentHue, paletteStyle, blackMode, colorTheme]);

  // Apply font family, size, weight & opacity
  useEffect(() => {
    const fontMap: Record<string, string> = {
      default: "'Inter', 'Noto Sans Arabic', system-ui, -apple-system, sans-serif",
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
    <AppContext.Provider value={{ language, setLanguage, theme, setTheme, t, dir, accentHue, setAccentHue, paletteStyle, setPaletteStyle, colorTheme, setColorTheme, blackMode, setBlackMode, fontFamily, setFontFamily, fontSize, setFontSize, fontWeight, setFontWeight, fontOpacity, setFontOpacity, prayerMadhab, setPrayerMadhab, midnightMode, setMidnightMode, latitudeAdjMethod, setLatitudeAdjMethod, dstEnabled, setDstEnabled }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
