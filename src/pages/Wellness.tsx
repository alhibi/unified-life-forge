import { useState, useEffect, useCallback } from 'react';
import SEO from '@/components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, Download, Dumbbell,
  Library, ShieldCheck, Trash2, Utensils, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { useWellnessData } from '@/features/wellness/useWellnessData';

// Tabs
import DietTab from '@/features/wellness/DietTab';
import InsightsTab from '@/features/wellness/InsightsTab';
import AtlasTab from '@/features/wellness/AtlasTab';
import WorkoutsTab from '@/features/wellness/premium/WorkoutsTab';
import CalisthenicsTab from '@/features/wellness/premium/CalisthenicsTab';
import EncyclopediaTab from '@/features/wellness/EncyclopediaTab';

import { exportAll } from '@/features/wellness/wellnessDb';

type TabKey =
  | 'workouts' | 'cali'
  | 'diet'
  | 'insights' | 'atlas' | 'encyclopedia';

const STORAGE_KEY = 'wellness:lastTab';

const T = {
  title: { ar: 'العافية', de: 'Wellness' },
  privacy: { ar: 'الخصوصية', de: 'Privatsphäre' },
  privacyTitle: { ar: 'الخصوصية والتحكم', de: 'Datenschutz & Kontrolle' },
  privacyBody: {
    ar: 'بيانات العافية تُخزّن محلياً على متصفحك فقط باستخدام IndexedDB. لا يتم رفعها إلى أي خادم. أنت المالك الوحيد.',
    de: 'Wellness-Daten werden nur lokal im Browser (IndexedDB) gespeichert — nichts wird an Server übertragen. Du hast die volle Kontrolle.',
  },
  exportData: { ar: 'تصدير بياناتي', de: 'Daten exportieren' },
  wipe: { ar: 'حذف جميع البيانات', de: 'Alle Daten löschen' },
  wipeConfirm: { ar: 'هل أنت متأكد؟ لا يمكن التراجع.', de: 'Bist du sicher? Nicht rückgängig.' },
  close: { ar: 'إغلاق', de: 'Schließen' },
  exportOk: { ar: 'تم التصدير بنجاح', de: 'Export erfolgreich' },
  exportErr: { ar: 'فشل التصدير', de: 'Export fehlgeschlagen' },
  wipeOk: { ar: 'تم حذف جميع بيانات العافية', de: 'Alle Wellness-Daten gelöscht' },
};

interface TabDef {
  key: TabKey;
  labelAr: string;
  labelDe: string;
  icon: any;
}

const TABS: TabDef[] = [
  { key: 'workouts',    labelAr: 'التمارين',     labelDe: 'Training',      icon: Dumbbell  },
  { key: 'cali',        labelAr: 'كاليستنيكس',   labelDe: 'Calisthenics',  icon: Dumbbell  },
  { key: 'diet',        labelAr: 'التغذية',      labelDe: 'Essen',         icon: Utensils  },
  { key: 'insights',    labelAr: 'التحليلات',    labelDe: 'Insights',      icon: Brain     },
  { key: 'atlas',       labelAr: 'الأطلس',       labelDe: 'Atlas',         icon: BookOpen  },
  { key: 'encyclopedia',labelAr: 'الموسوعة',     labelDe: 'Wissen',        icon: Library   },
];

export default function WellnessPage() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const data = useWellnessData();

  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TabKey | null;
      if (saved && TABS.some((t) => t.key === saved)) return saved;
    } catch { /* noop */ }
    return 'workouts';
  });
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch { /* noop */ }
  }, [tab]);

  // Close privacy sheet on Escape
  useEffect(() => {
    if (!showPrivacy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPrivacy(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPrivacy]);

  const handleExport = async () => {
    try {
      const out = await exportAll();
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wellness-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(T.exportOk[language]);
    } catch {
      toast.error(T.exportErr[language]);
    }
  };

  const handleWipe = async () => {
    if (!window.confirm(T.wipeConfirm[language])) return;
    await data.wipe();
    // Also reset the onboarding flag so a freshly-cleared user gets the
    // welcome modal again.
    try { localStorage.removeItem('wellness:onboarded'); } catch { /* noop */ }
    setShowPrivacy(false);
    toast.success(T.wipeOk[language]);
  };

  const renderTab = useCallback(() => {
    if (data.loading) {
      return (
        <div className="space-y-2 pt-1">
          <div className="h-20 rounded-xl animate-pulse bg-muted/30" />
          <div className="h-16 rounded-xl animate-pulse bg-muted/20" />
          <div className="h-20 rounded-xl animate-pulse bg-muted/25" />
        </div>
      );
    }
    switch (tab) {
      case 'workouts':
        return (
          <WorkoutsTab
            workouts={data.workouts}
            profile={data.profile}
            onSave={data.saveWorkoutSession}
            onDelete={data.removeWorkoutSession}
          />
        );
      case 'cali':
        return <CalisthenicsTab onJump={(k) => setTab(k as TabKey)} />;
      case 'diet':
        return (
          <DietTab
            dietLogs={data.dietLogs}
            profile={data.profile}
            onAdd={data.addDiet}
            onRemove={data.removeDiet}
            onPatch={data.patchDiet}
          />
        );
      case 'insights':
        return (
          <InsightsTab
            supplements={data.supplements}
            intakeLogs={data.intakeLogs}
            dietLogs={data.dietLogs}
            skinHair={data.skinHair}
          />
        );
      case 'atlas':
        return <AtlasTab />;
      case 'encyclopedia':
        return <EncyclopediaTab />;
      default:
        return null;
    }
  }, [tab, data]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title={isAr ? 'الصحة والعافية — SmartHub' : 'Wellness — SmartHub'}
        description={isAr
          ? 'تطبيق العافية المتكامل: تمارين، حاسبات، تعافٍ، تغذية، مكملات — كل البيانات محلية وآمنة.'
          : 'Premium-Wellness-App: Workouts, Rechner, Recovery, Ernährung, Supplemente — alle Daten lokal.'}
        path="/wellness"
      />

      <div className="max-w-lg mx-auto px-3 pt-6">
        {/* ─── Minimal Header ─── */}
        <header className="flex items-center justify-between mb-3">
          <BackButton />
          <h1 className="text-[17px] font-medium tracking-tight text-foreground">
            {T.title[language]}
          </h1>
          <button
            onClick={() => setShowPrivacy(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={T.privacy[language]}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* ─── Refined dock navigation ─── */}
        <nav className="mb-3" aria-label="wellness sections">
          <div
            className="bg-card/80 backdrop-blur border border-border/45 rounded-2xl p-1 flex items-center gap-0.5 overflow-x-auto scrollbar-none"
            dir="ltr"
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-pressed={active}
                  aria-label={t.labelAr}
                  className={`relative shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl transition-colors duration-150 ${
                    active
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="wellness-dock-pill"
                      className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.4 : 2} />
                    <span
                      className={`text-[12px] font-semibold whitespace-nowrap leading-none ${
                        active ? '' : 'tracking-tight'
                      }`}
                    >
                      {isAr ? t.labelAr : t.labelDe}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          <motion.main
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2.5"
          >
            {renderTab()}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* ─── Privacy bottom-sheet ─── */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-t-2xl bg-card border-t border-border/50 p-4 pb-6 space-y-3"
            >
              <div className="w-8 h-0.5 rounded-full bg-muted-foreground/30 mx-auto mb-2" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-[13px] font-medium text-foreground">{T.privacyTitle[language]}</h3>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">{T.privacyBody[language]}</p>

              <div className="space-y-1.5">
                <button
                  onClick={handleExport}
                  className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <Download className="w-3 h-3" />
                  {T.exportData[language]}
                </button>
                <button
                  onClick={handleWipe}
                  className="w-full py-2 rounded-xl bg-destructive/8 text-destructive text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <Trash2 className="w-3 h-3" />
                  {T.wipe[language]}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
