import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'de';
type Theme = 'light' | 'dark' | 'system';
type PaletteStyle = 'tonal' | 'vibrant' | 'expressive' | 'neutral' | 'rainbow';

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
  blackMode: boolean;
  setBlackMode: (v: boolean) => void;
}

const translations: Record<string, Record<Language, string>> = {
  'app.title': { ar: 'تطبيقي الذكي', de: 'Meine Smart App' },
  'greeting.morning': { ar: 'صباح الخير', de: 'Guten Morgen' },
  'greeting.afternoon': { ar: 'مساء الخير', de: 'Guten Tag' },
  'greeting.evening': { ar: 'مساء الخير', de: 'Guten Abend' },
  'nav.home': { ar: 'الرئيسية', de: 'Start' },
  'nav.games': { ar: 'الألعاب', de: 'Spiele' },
  'nav.settings': { ar: 'الإعدادات', de: 'Einstellungen' },
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const PALETTE_CONFIGS: Record<PaletteStyle, { sat: number; lightDark: number; lightLight: number }> = {
  tonal:      { sat: 50, lightDark: 55, lightLight: 48 },
  vibrant:    { sat: 75, lightDark: 60, lightLight: 50 },
  expressive: { sat: 65, lightDark: 58, lightLight: 45 },
  neutral:    { sat: 20, lightDark: 60, lightLight: 50 },
  rainbow:    { sat: 70, lightDark: 58, lightLight: 50 },
};

function applyAccentHue(_hue: number, _isDark: boolean, _palette: PaletteStyle) {
  // No longer dynamically overriding CSS variables - using defaults from index.css
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

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
  };

  const setAccentHue = (hue: number) => {
    setAccentHueState(hue);
    localStorage.setItem('app-accent-hue', hue.toString());
  };

  const setPaletteStyle = (style: PaletteStyle) => {
    setPaletteStyleState(style);
    localStorage.setItem('app-palette-style', style);
  };

  const setBlackMode = (v: boolean) => {
    setBlackModeState(v);
    localStorage.setItem('app-black-mode', v.toString());
  };

  const t = (key: string): string => translations[key]?.[language] || key;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('black-mode', isDark && blackMode);
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    applyAccentHue(accentHue, isDark, paletteStyle);

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
  }, [theme, dir, language, accentHue, paletteStyle, blackMode]);

  return (
    <AppContext.Provider value={{ language, setLanguage, theme, setTheme, t, dir, accentHue, setAccentHue, paletteStyle, setPaletteStyle, blackMode, setBlackMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
