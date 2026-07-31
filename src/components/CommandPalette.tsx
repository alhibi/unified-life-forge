import { Command } from 'cmdk';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import { useSystemEngine } from '@/contexts/SystemEngineContext';
import {
  Battery,
  BookOpen,
  ChevronRight,
  Compass,
  Dumbbell,
  Gamepad2,
  Layout,
  MapPin,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Wifi,
} from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';

/** Custom event any surface (e.g. a mobile toolbar button) can dispatch. */
export const COMMAND_PALETTE_EVENT = 'app:command-palette';

/** Open the palette from anywhere — used by touch surfaces with no Cmd+K. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
}

const ROUTES: { path: string; label: string; keywords: string; icon: typeof Compass }[] = [
  { path: '/', label: 'البوابة الرئيسية', keywords: 'home portal start بوابة رئيسية', icon: Compass },
  { path: '/now', label: 'الآن — الصلاة والطقس', keywords: 'now prayer weather الآن صلاة طقس', icon: Sparkles },
  { path: '/mihrab', label: 'المحراب — القرآن والأذكار', keywords: 'mihrab quran dhikr محراب قرآن أذكار', icon: BookOpen },
  { path: '/wellness', label: 'العافية — التدريب والتغذية', keywords: 'wellness fitness nutrition عافية تدريب تغذية', icon: Dumbbell },
  { path: '/chat', label: 'المحادثات والرسائل', keywords: 'chat messages محادثات رسائل', icon: MessageSquare },
  { path: '/browse', label: 'اطلاع — مقالات وبودكاست', keywords: 'browse articles podcasts اطلاع مقالات بودكاست', icon: Compass },
  { path: '/knowledge', label: 'المعرفة — الموسوعة', keywords: 'knowledge encyclopedia معرفة موسوعة', icon: Shield },
  { path: '/games', label: 'الألعاب', keywords: 'games play ألعاب', icon: Gamepad2 },
  { path: '/weather', label: 'الطقس بالتفصيل', keywords: 'weather forecast طقس توقعات', icon: MapPin },
  { path: '/pkm', label: 'الذاكرة — الملاحظات', keywords: 'pkm notes ذاكرة ملاحظات', icon: Sparkles },
  { path: '/journal', label: 'مذكرتي', keywords: 'journal diary مذكرة يوميات', icon: BookOpen },
  { path: '/travel-atlas', label: 'أطلس الرحلات — خريطة أماكنك', keywords: 'travel atlas places map أطلس رحلات أماكن خريطة سفر سياحة دول', icon: MapPin },
  { path: '/travel-atlas/trips', label: 'رحلاتي — تخطيط الرحلات', keywords: 'trips itinerary plan رحلات خطة مسار جدول', icon: MapPin },
  { path: '/archive', label: 'أرشيف المعرفة', keywords: 'archive أرشيف', icon: Shield },
  { path: '/settings', label: 'الإعدادات', keywords: 'settings preferences إعدادات', icon: Settings },
];

const ITEM_CLASS =
  'flex items-center justify-between gap-3 px-3 py-2 text-sm text-foreground/80 rounded-md cursor-pointer border border-transparent aria-selected:border-primary/40 aria-selected:bg-accent aria-selected:text-foreground';

const PILL_CLASS = 'text-mini px-2 py-0.5 rounded-sm border shrink-0';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { theme, setTheme } = useApp();
  const {
    dataSaver,
    batterySaver,
    toggleDataSaverManual,
    toggleBatterySaverManual,
    splitActive,
    setSplitActive,
  } = useSystemEngine();

  // Cmd/Ctrl+K toggles, Escape closes. Both were previously missing the
  // Escape branch even though the footer advertised an ESC shortcut.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const handleOpen = () => setOpen(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, handleOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, handleOpen);
    };
  }, []);

  const runCommand = useCallback((action: () => void) => {
    action();
    setOpen(false);
    setSearch('');
  }, []);

  // Warm up the most likely destinations once the palette is visible.
  useEffect(() => {
    if (!open) return;
    prefetchRoute('/now');
    prefetchRoute('/mihrab');
    prefetchRoute('/settings');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-overlay flex items-start justify-center px-4 pt-[10vh]">
      <button
        type="button"
        aria-label="إغلاق لوحة الأوامر"
        className="app-scrim"
        onClick={() => setOpen(false)}
      />

      <div
        className="relative z-raised flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border/60 bg-card text-card-foreground shadow-lg animate-fade-in"
        dir="rtl"
      >
        <Command label="لوحة الأوامر" className="flex h-full max-h-[60vh] flex-col">
          <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="ابحث عن صفحة أو إعداد أو إجراء…"
              className="flex-1 border-none bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden h-5 shrink-0 select-none items-center rounded-sm border border-border/50 bg-muted px-1.5 font-mono text-micro font-medium text-muted-foreground sm:inline-flex">
              ESC
            </kbd>
          </div>

          <Command.List className="flex-1 space-y-1 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </Command.Empty>

            <Command.Group
              heading={
                <span className="px-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                  التنقّل السريع
                </span>
              }
            >
              {ROUTES.map((route) => {
                const Icon = route.icon;
                return (
                  <Command.Item
                    key={route.path}
                    value={`${route.label} ${route.keywords}`}
                    onSelect={() => runCommand(() => navigate(route.path))}
                    onMouseEnter={() => prefetchRoute(route.path)}
                    className={ITEM_CLASS}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <span>{route.label}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 rotate-180 opacity-50" aria-hidden />
                  </Command.Item>
                );
              })}
            </Command.Group>

            <div className="my-2 h-px bg-border/60" />

            <Command.Group
              heading={
                <span className="px-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                  النظام والبيئة
                </span>
              }
            >
              <Command.Item
                value="theme dark light سمة مظهر ليلي نهاري"
                onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                className={ITEM_CLASS}
              >
                <span className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-muted-foreground" aria-hidden />
                  ) : (
                    <Moon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                  <span>تبديل المظهر</span>
                </span>
                <span className={`${PILL_CLASS} border-border/50 bg-muted text-muted-foreground`}>
                  {theme === 'dark' ? 'نهاري' : 'ليلي'}
                </span>
              </Command.Item>

              <Command.Item
                value="data saver توفير البيانات"
                onSelect={() => runCommand(toggleDataSaverManual)}
                className={ITEM_CLASS}
              >
                <span className="flex items-center gap-3">
                  <Wifi className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>توفير البيانات</span>
                </span>
                <span
                  className={`${PILL_CLASS} ${
                    dataSaver
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted text-muted-foreground'
                  }`}
                >
                  {dataSaver ? 'مفعّل' : 'معطّل'}
                </span>
              </Command.Item>

              <Command.Item
                value="battery saver موفر البطارية الطاقة"
                onSelect={() => runCommand(toggleBatterySaverManual)}
                className={ITEM_CLASS}
              >
                <span className="flex items-center gap-3">
                  <Battery className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>موفّر البطارية</span>
                </span>
                <span
                  className={`${PILL_CLASS} ${
                    batterySaver
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted text-muted-foreground'
                  }`}
                >
                  {batterySaver ? 'مفعّل' : 'معطّل'}
                </span>
              </Command.Item>

              <Command.Item
                value="split screen مساحة عمل منقسمة"
                onSelect={() => runCommand(() => setSplitActive(!splitActive))}
                className={ITEM_CLASS}
              >
                <span className="flex items-center gap-3">
                  <Layout className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>مساحة العمل المنقسمة</span>
                </span>
                <span
                  className={`${PILL_CLASS} ${
                    splitActive
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted text-muted-foreground'
                  }`}
                >
                  {splitActive ? 'مفتوحة' : 'مغلقة'}
                </span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-border/50 bg-muted px-4 py-2 text-mini text-muted-foreground">
            <span>تنقّل بالأسهم ⇅</span>
            <span>Enter للتنفيذ</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
