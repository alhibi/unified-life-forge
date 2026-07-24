import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useSystemEngine } from '@/contexts/SystemEngineContext';
import { prefetchRoute } from '@/lib/routePrefetch';
import {
  Search, Settings, BookOpen, MessageSquare, Play, RefreshCw,
  Battery, Wifi, Layout, Shield, Undo, Redo, LogOut, Compass,
  MapPin, Dumbbell, Sparkles, HelpCircle, Gamepad2, ChevronRight
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { language, theme, setTheme, setLanguage, colorTheme, setColorTheme } = useApp();
  const {
    dataSaver, batterySaver, toggleDataSaverManual, toggleBatterySaverManual,
    undo, redo, canUndo, canRedo, splitActive, setSplitActive,
    isPasskeyRegistered, registerPasskey, lockAppSession
  } = useSystemEngine();

  const isAr = language === 'ar';

  // Listen to Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runCommand = (action: () => void) => {
    action();
    setOpen(false);
    setSearch('');
  };

  const handleNavigate = (path: string) => {
    runCommand(() => navigate(path));
  };

  // Define navigation routes
  const routes = [
    { path: '/', label: { ar: 'الرئيسية (لوحة التحكم)', de: 'Startseite (Dashboard)' }, icon: Compass },
    { path: '/mihrab', label: { ar: 'المحراب (القرآن والأذكار)', de: 'Mihrab (Koran & Dhikr)' }, icon: BookOpen },
    { path: '/wellness', label: { ar: 'الصحة واللياقة البدنية', de: 'Wellness & Fitness' }, icon: Dumbbell },
    { path: '/chat', label: { ar: 'المحادثات والرسائل', de: 'Chat & Nachrichten' }, icon: MessageSquare },
    { path: '/games', label: { ar: 'الألعاب والترفيه', de: 'Spiele & Unterhaltung' }, icon: Gamepad2 },
    { path: '/weather', label: { ar: 'أحوال الطقس بالتفصيل', de: 'Wettervorhersage' }, icon: MapPin },
    { path: '/pkm', label: { ar: 'مذكرات المعرفة الشخصية (PKM)', de: 'Persönliches Wissensmanagement' }, icon: Sparkles },
    { path: '/pkm/mind', label: { ar: 'العقل الحي ثلاثي الأبعاد', de: '3D Living Mind' }, icon: Layout },
    { path: '/journal', label: { ar: 'يومياتي (Journal)', de: 'Tagebuch' }, icon: BookOpen },
    { path: '/travel-atlas', label: { ar: 'أطلس الرحلات والأماكن', de: 'Reiseatlas & Orte' }, icon: MapPin },
    { path: '/archive', label: { ar: 'أرشيف المعرفة العالمي', de: 'Klassisches Wissensarchiv' }, icon: Shield },
    { path: '/settings', label: { ar: 'إعدادات النظام', de: 'Systemeinstellungen' }, icon: Settings },
  ];

  // Prefetch first few routes when search opens or changes
  useEffect(() => {
    if (open) {
      // Warm up most common modules
      prefetchRoute('/');
      prefetchRoute('/mihrab');
      prefetchRoute('/pkm');
      prefetchRoute('/chat');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-start justify-center pt-[10vh] px-4">
      {/* 100% Solid matte backdrop - no blurs, no gradients per Zen Elite guidelines */}
      <div
        className="fixed inset-0 bg-neutral-950/85 transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Command Palette Modal - Full Zen Elite design system alignment
          - Solid matte background
          - 1px hairline border with NO box shadows
          - Border radius exactly 0.85rem (rounded-xl)
          - Copper (#C9A84C) active state focus indicator
      */}
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden z-10 flex flex-col animate-fade-in"
           style={{ direction: isAr ? 'rtl' : 'ltr' }}>
        <Command label="Universal Command Palette" className="flex flex-col h-full max-h-[60vh]">
          {/* Header Input Area */}
          <div className="flex items-center px-4 py-3 border-b border-neutral-850 gap-3">
            <Search className="w-5 h-5 text-neutral-400 shrink-0" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={isAr ? 'ابحث عن صفحات، إعدادات، أو إجراءات...' : 'Suche nach Seiten, Einstellungen oder Aktionen...'}
              className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-500 text-sm outline-none border-none py-1 focus:ring-0"
            />
            <kbd className="hidden sm:inline-flex items-center h-5 select-none pointer-events-none rounded px-1.5 font-mono text-[10px] font-medium bg-neutral-950 text-neutral-400 border border-neutral-800 shrink-0">
              ESC
            </kbd>
          </div>

          <Command.List className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            <Command.Empty className="text-center py-6 text-sm text-neutral-500">
              {isAr ? 'لم يتم العثور على نتائج.' : 'Keine Ergebnisse gefunden.'}
            </Command.Empty>

            {/* Section: Dynamic Pages & Navigation */}
            <Command.Group heading={<span className="px-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{isAr ? 'التنقل السريع' : 'SCHNELLNAVIGATION'}</span>}>
              {routes.map((route) => {
                const Icon = route.icon;
                return (
                  <Command.Item
                    key={route.path}
                    value={route.label.de + ' ' + route.label.ar}
                    onSelect={() => handleNavigate(route.path)}
                    className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-neutral-400 group-aria-selected:text-[#C9A84C]" />
                      <span>{isAr ? route.label.ar : route.label.de}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </Command.Item>
                );
              })}
            </Command.Group>

            <div className="h-[1px] bg-neutral-850 my-2" />

            {/* Section: Quick Settings & Hardware Control */}
            <Command.Group heading={<span className="px-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{isAr ? 'إعدادات النظام والبيئة' : 'SYSTEM & UMGEBUNG'}</span>}>
              {/* Toggle Language */}
              <Command.Item
                value="language sprache"
                onSelect={() => runCommand(() => setLanguage(language === 'ar' ? 'de' : 'ar'))}
                className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'تغيير اللغة إلى الألمانية' : 'Sprache auf Arabisch umstellen'}</span>
                </div>
                <span className="text-xs bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 font-mono">
                  {language === 'ar' ? 'Deutsch' : 'العربية'}
                </span>
              </Command.Item>

              {/* Toggle Theme */}
              <Command.Item
                value="theme design farbe"
                onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
              >
                <div className="flex items-center gap-3">
                  <Layout className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'تغيير نمط المظهر' : 'Themamodus wechseln'}</span>
                </div>
                <span className="text-xs bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 font-mono">
                  {theme === 'dark' ? (isAr ? 'نهاري' : 'Hell') : (isAr ? 'ليلي' : 'Dunkel')}
                </span>
              </Command.Item>

              {/* Toggle Data Saver */}
              <Command.Item
                value="data saver sparmodus daten"
                onSelect={() => runCommand(toggleDataSaverManual)}
                className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
              >
                <div className="flex items-center gap-3">
                  <Wifi className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'توفير البيانات الفائق' : 'Daten-Sparmodus umschalten'}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono ${dataSaver ? 'bg-neutral-950 text-[#C9A84C] border-[#C9A84C]/30' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}>
                  {dataSaver ? (isAr ? 'مفعّل' : 'Aktiv') : (isAr ? 'معطّل' : 'Inaktiv')}
                </span>
              </Command.Item>

              {/* Toggle Battery Saver */}
              <Command.Item
                value="battery saver akku sparen"
                onSelect={() => runCommand(toggleBatterySaverManual)}
                className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
              >
                <div className="flex items-center gap-3">
                  <Battery className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'موفر الطاقة الذكي' : 'Akkusparmodus umschalten'}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono ${batterySaver ? 'bg-neutral-950 text-[#C9A84C] border-[#C9A84C]/30' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}>
                  {batterySaver ? (isAr ? 'مفعّل' : 'Aktiv') : (isAr ? 'معطّل' : 'Inaktiv')}
                </span>
              </Command.Item>

              {/* Toggle Split-Pane Workspace */}
              <Command.Item
                value="split screen dual pane split workspace"
                onSelect={() => runCommand(() => setSplitActive(!splitActive))}
                className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
              >
                <div className="flex items-center gap-3">
                  <Layout className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'مساحة عمل منقسمة ثنائية الأبعاد' : 'Dual-Pane Workspace umschalten'}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono ${splitActive ? 'bg-neutral-950 text-[#C9A84C] border-[#C9A84C]/30' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}>
                  {splitActive ? (isAr ? 'مفتوح' : 'Offen') : (isAr ? 'مغلق' : 'Geschlossen')}
                </span>
              </Command.Item>
            </Command.Group>

            <div className="h-[1px] bg-neutral-850 my-2" />

            {/* Section: Universal Actions & Time-Travel Rollback */}
            <Command.Group heading={<span className="px-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{isAr ? 'إجراءات النظام ومحاكي الأفعال' : 'AKTIONEN & TIME-TRAVEL'}</span>}>
              {/* Undo action */}
              <Command.Item
                value="undo rückgängig"
                disabled={!canUndo}
                onSelect={() => runCommand(undo)}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-all border border-transparent ${!canUndo ? 'opacity-40 cursor-not-allowed' : 'text-neutral-300 hover:bg-neutral-950 aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]'}`}
              >
                <div className="flex items-center gap-3">
                  <Undo className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'التراجع عن الإجراء الأخير (Undo)' : 'Letzte Aktion rückgängig machen'}</span>
                </div>
                <kbd className="text-[10px] font-mono text-neutral-500 bg-neutral-950 border border-neutral-850 px-1 py-0.5 rounded">
                  Ctrl+Z
                </kbd>
              </Command.Item>

              {/* Redo action */}
              <Command.Item
                value="redo wiederholen"
                disabled={!canRedo}
                onSelect={() => runCommand(redo)}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-all border border-transparent ${!canRedo ? 'opacity-40 cursor-not-allowed' : 'text-neutral-300 hover:bg-neutral-950 aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]'}`}
              >
                <div className="flex items-center gap-3">
                  <Redo className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'إعادة الإجراء الأخير (Redo)' : 'Aktion wiederholen'}</span>
                </div>
                <kbd className="text-[10px] font-mono text-neutral-500 bg-neutral-950 border border-neutral-850 px-1 py-0.5 rounded">
                  Ctrl+Y
                </kbd>
              </Command.Item>

              {/* Lock App Session */}
              <Command.Item
                value="lock app block session safe biometrics"
                onSelect={() => runCommand(lockAppSession)}
                className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-neutral-400" />
                  <span>{isAr ? 'قفل الجلسة بيومترياً فوراً' : 'Sitzung sofort biometrisch sperren'}</span>
                </div>
                <span className="text-xs bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded text-[#C9A84C]">
                  {isAr ? 'تأمين' : 'Sichern'}
                </span>
              </Command.Item>

              {/* Setup Passkey */}
              {!isPasskeyRegistered && (
                <Command.Item
                  value="passkey register setup finger biometrics"
                  onSelect={() => runCommand(registerPasskey)}
                  className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-950 cursor-pointer transition-all border border-transparent aria-selected:border-[#C9A84C]/50 aria-selected:bg-neutral-950 aria-selected:text-[#C9A84C]"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-[#C9A84C]" />
                    <span className="text-[#C9A84C] font-semibold">{isAr ? 'تسجيل مفتاح مرور بيومتري جديد' : 'Neuen Passkey registrieren'}</span>
                  </div>
                  <span className="text-xs text-[#C9A84C] border border-[#C9A84C]/30 px-1.5 py-0.5 rounded bg-neutral-950">
                    Passkey
                  </span>
                </Command.Item>
              )}
            </Command.Group>
          </Command.List>

          {/* Footer Guide / Instructions */}
          <div className="px-4 py-2 bg-neutral-950 border-t border-neutral-850 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              {isAr ? 'تنقّل بالأسهم ⇅' : 'Steuerung per Pfeiltasten ⇅'}
            </span>
            <span className="flex items-center gap-1">
              {isAr ? 'اضغط Enter للتنفيذ' : 'Enter zum Bestätigen'}
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
