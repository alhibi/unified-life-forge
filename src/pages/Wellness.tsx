import React, { useState, useEffect, useMemo } from 'react';
import SEO from '@/components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BookOpen, Brain, Download, Dumbbell, HeartPulse, Pill,
  ShieldCheck, Sparkles, Target, Trash2, User, Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { useWellnessData } from '@/features/wellness/useWellnessData';

// Existing tabs
import SupplementsTab from '@/features/wellness/SupplementsTab';
import DietTab from '@/features/wellness/DietTab';
import SkinHairTab from '@/features/wellness/SkinHairTab';
import VitalsTab from '@/features/wellness/VitalsTab';
import InsightsTab from '@/features/wellness/InsightsTab';
import AtlasTab from '@/features/wellness/AtlasTab';

// Premium tabs
import TodayTab from '@/features/wellness/premium/TodayTab';
import AthleticHubTab from '@/features/wellness/premium/AthleticHubTab';
import WorkoutsTab from '@/features/wellness/premium/WorkoutsTab';
import GoalsTab from '@/features/wellness/premium/GoalsTab';
import ProfileTab from '@/features/wellness/premium/ProfileTab';

import { exportAll } from '@/features/wellness/wellnessDb';

type TabKey =
  | 'today' | 'workouts' | 'hub' | 'goals'
  | 'supplements' | 'diet' | 'vitals' | 'skin'
  | 'insights' | 'atlas' | 'profile';

const STORAGE_KEY = 'wellness:lastTab';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

const T = {
  title: { ar: 'العافية', de: 'Wellness' },
  subtitle: { ar: 'محلي بالكامل', de: '100% lokal' },
  privacy: { ar: 'الخصوصية', de: 'Privatsphäre' },
  privacyTitle: { ar: 'الخصوصية والتحكم', de: 'Datenschutz & Kontrolle' },
  privacyBody: {
    ar: 'بيانات العافية تُخزّن محلياً على متصفحك فقط باستخدام IndexedDB. لا يتم رفعها إلى أي خادم.',
    de: 'Wellness-Daten werden nur lokal im Browser (IndexedDB) gespeichert — nichts wird übertragen.',
  },
  exportData: { ar: 'تصدير بياناتي', de: 'Daten exportieren' },
  wipe: { ar: 'حذف جميع البيانات', de: 'Alle Daten löschen' },
  close: { ar: 'إغلاق', de: 'Schließen' },
  exportOk: { ar: 'تم التصدير', de: 'Export erfolgreich' },
  exportErr: { ar: 'فشل التصدير', de: 'Export fehlgeschlagen' },
  wipeOk: { ar: 'تم حذف جميع بيانات العافية', de: 'Alle Wellness-Daten gelöscht' },
  // First-run onboarding
  welcomeTitle: { ar: 'أهلاً بك في العافية', de: 'Willkommen bei Wellness' },
  welcomeBody: {
    ar: 'تطبيق متكامل للرياضيين: تتبّع التمارين، حاسبات احترافية، تعافٍ ذكي، وكل بياناتك محلية على جهازك فقط.',
    de: 'Eine umfassende App für Athleten: Workouts loggen, Profi-Rechner, intelligente Recovery — alle Daten lokal.',
  },
  feat1: { ar: 'سجلّ تمارينك مع PRs', de: 'Workouts mit Rekorden tracken' },
  feat2: { ar: 'حاسبات استقلاب وقوة وVO₂', de: 'Stoffwechsel-, Kraft- und VO₂-Rechner' },
  feat3: { ar: 'نقاط تعافٍ وجاهزية', de: 'Recovery & Readiness Score' },
  feat4: { ar: 'صيام، ترطيب، ومكملات', de: 'Fasten, Hydration & Supplemente' },
  setupCta: { ar: 'ابدأ الإعداد', de: 'Profil einrichten' },
  later: { ar: 'لاحقاً', de: 'Später' },
};

interface TabDef {
  key: TabKey;
  labelAr: string;
  labelDe: string;
  icon: any;
  /** Group: 0 = athletic premium, 1 = legacy/health, 2 = profile */
  group: 0 | 1 | 2;
}

const TABS: TabDef[] = [
  // Premium (group 0)
  { key: 'today',       labelAr: 'اليوم',     labelDe: 'Heute',    icon: Sparkles,  group: 0 },
  { key: 'workouts',    labelAr: 'تمارين',    labelDe: 'Training', icon: Dumbbell,  group: 0 },
  { key: 'hub',         labelAr: 'الرياضة',   labelDe: 'Athletik', icon: Activity,  group: 0 },
  { key: 'goals',       labelAr: 'أهدافي',    labelDe: 'Ziele',    icon: Target,    group: 0 },
  // Health (group 1)
  { key: 'supplements', labelAr: 'مكملات',    labelDe: 'Supps',    icon: Pill,      group: 1 },
  { key: 'diet',        labelAr: 'تغذية',     labelDe: 'Essen',    icon: Utensils,  group: 1 },
  { key: 'vitals',      labelAr: 'حيوية',     labelDe: 'Vitale',   icon: HeartPulse,group: 1 },
  { key: 'skin',        labelAr: 'الجسد',     labelDe: 'Körper',   icon: User,      group: 1 },
  { key: 'insights',    labelAr: 'تحليلات',   labelDe: 'Insights', icon: Brain,     group: 1 },
  { key: 'atlas',       labelAr: 'الأطلس',    labelDe: 'Atlas',    icon: BookOpen,  group: 1 },
  // Profile (group 2)
  { key: 'profile',     labelAr: 'ملفّي',     labelDe: 'Profil',   icon: User,      group: 2 },
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
    return 'today';
  });
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Persist last-active tab.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch { /* noop */ }
  }, [tab]);

  // First-run onboarding: show once, dismiss on action.
  useEffect(() => {
    if (data.loading) return;
    if (data.profile) return;
    try {
      const dismissed = localStorage.getItem('wellness:onboarded');
      if (dismissed) return;
    } catch { /* noop */ }
    setShowOnboarding(true);
  }, [data.loading, data.profile]);

  const dismissOnboarding = (gotoProfile: boolean) => {
    setShowOnboarding(false);
    try { localStorage.setItem('wellness:onboarded', '1'); } catch { /* noop */ }
    if (gotoProfile) setTab('profile');
  };

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
    await data.wipe();
    setShowPrivacy(false);
    toast.success(T.wipeOk[language]);
  };

  // Group tabs for the two-row tab bar.
  const premiumTabs = TABS.filter((t) => t.group === 0);
  const healthTabs = TABS.filter((t) => t.group === 1);
  const profileTab = TABS.find((t) => t.group === 2)!;

  const renderTab = () => {
    if (data.loading) {
      return (
        <div className="space-y-3">
          <div className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
          <div className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
          <div className="h-40 bg-muted/40 rounded-2xl animate-pulse" />
        </div>
      );
    }
    switch (tab) {
      case 'today':
        return (
          <TodayTab
            profile={data.profile}
            supplements={data.supplements}
            intakeLogs={data.intakeLogs}
            vitals={data.vitals}
            skinHair={data.skinHair}
            workouts={data.workouts}
            hydration={data.hydration}
            activeFasting={data.activeFasting}
            onLogHydration={(ml) => data.addHydration(ml)}
            onStartFasting={(hours, protocol) => data.beginFasting(hours, protocol)}
            onEndFasting={() => data.stopFasting()}
            onSaveVital={data.saveVital}
            onJump={(k) => setTab(k as TabKey)}
          />
        );
      case 'workouts':
        return (
          <WorkoutsTab
            workouts={data.workouts}
            profile={data.profile}
            onSave={data.saveWorkoutSession}
            onDelete={data.removeWorkoutSession}
          />
        );
      case 'hub':
        return (
          <AthleticHubTab
            profile={data.profile}
            vitals={data.vitals}
            workouts={data.workouts}
            onJump={(k) => setTab(k as TabKey)}
          />
        );
      case 'goals':
        return (
          <GoalsTab
            profile={data.profile}
            goals={data.goals}
            vitals={data.vitals}
            workouts={data.workouts}
            hydration={data.hydration}
            skinHair={data.skinHair}
            dietLogs={data.dietLogs}
            onSave={data.saveUserGoal}
            onDelete={data.removeUserGoal}
          />
        );
      case 'supplements':
        return (
          <SupplementsTab
            supplements={data.supplements}
            intakeLogs={data.intakeLogs}
            onSave={data.addOrUpdateSupplement}
            onDelete={data.removeSupplement}
            onLogIntake={data.addIntake}
          />
        );
      case 'diet':
        return (
          <DietTab
            dietLogs={data.dietLogs}
            onAdd={data.addDiet}
            onRemove={data.removeDiet}
          />
        );
      case 'vitals':
        return <VitalsTab vitals={data.vitals} onSave={data.saveVital} />;
      case 'skin':
        return <SkinHairTab skinHair={data.skinHair} onSave={data.saveSkinHair} />;
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
      case 'profile':
        return (
          <ProfileTab
            profile={data.profile}
            vitals={data.vitals}
            onSave={data.saveAthleteProfile}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-10">
      <SEO
        title={isAr ? 'الصحة والعافية — SmartHub' : 'Wellness — SmartHub'}
        description={isAr
          ? 'تطبيق العافية المتكامل: تمارين، حاسبات، تعافٍ، تغذية، مكملات — كل البيانات محلية وآمنة.'
          : 'Premium-Wellness-App: Workouts, Rechner, Recovery, Ernährung, Supplemente — alle Daten lokal.'}
        path="/wellness"
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-4 max-w-lg mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between gap-3">
          <BackButton />
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-foreground truncate">
              {T.title[language]}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {T.subtitle[language]}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab('profile')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                tab === 'profile' ? 'bg-primary/15 text-primary' : 'bg-secondary/60 text-foreground'
              }`}
              aria-label={T.title[language]}
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center shrink-0"
              aria-label={T.privacy[language]}
            >
              <ShieldCheck className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Two-row tab bar */}
        <motion.div variants={item} className="space-y-1.5">
          {/* Row 1 — premium */}
          <div
            className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none"
            dir="ltr"
          >
            {premiumTabs.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all duration-200 ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-[0_4px_18px_-8px_hsl(var(--primary)/0.6)]'
                      : 'bg-card text-muted-foreground border-border/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-semibold">{isAr ? t.labelAr : t.labelDe}</span>
                </button>
              );
            })}
          </div>
          {/* Row 2 — health */}
          <div
            className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none"
            dir="ltr"
          >
            {healthTabs.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-primary/15 text-primary border-primary/40'
                      : 'bg-card text-muted-foreground border-border/40'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[11px] font-semibold">{isAr ? t.labelAr : t.labelDe}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Active content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ─── Privacy modal ─── */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{T.privacyTitle[language]}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{T.privacyBody[language]}</p>
              <button
                onClick={handleExport}
                className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Download className="w-4 h-4" />
                {T.exportData[language]}
              </button>
              <button
                onClick={handleWipe}
                className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Trash2 className="w-4 h-4" />
                {T.wipe[language]}
              </button>
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
              >
                {T.close[language]}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── First-run onboarding ─── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-5"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-sm rounded-3xl bg-card border border-border/50 p-6 space-y-4 overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 -top-32 h-64 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 100% at 50% 100%, hsl(var(--primary)/0.25), transparent 70%)',
                }}
              />
              <div className="relative">
                <div className="w-14 h-14 rounded-3xl bg-primary/15 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-[18px] font-bold text-foreground text-center mt-3">
                  {T.welcomeTitle[language]}
                </h2>
                <p className="text-[12px] text-muted-foreground text-center mt-1.5 leading-relaxed">
                  {T.welcomeBody[language]}
                </p>

                <ul className="space-y-2 mt-4">
                  {[T.feat1[language], T.feat2[language], T.feat3[language], T.feat4[language]].map(
                    (txt, i) => {
                      const icons = [Dumbbell, Activity, HeartPulse, Target];
                      const Icon = icons[i];
                      return (
                        <li key={i} className="flex items-center gap-2.5 text-[12px] text-foreground">
                          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                          </span>
                          <span className="leading-tight">{txt}</span>
                        </li>
                      );
                    },
                  )}
                </ul>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => dismissOnboarding(false)}
                    className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-[13px] font-medium"
                  >
                    {T.later[language]}
                  </button>
                  <button
                    onClick={() => dismissOnboarding(true)}
                    className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold active:scale-[0.98] transition-transform"
                  >
                    {T.setupCta[language]}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
