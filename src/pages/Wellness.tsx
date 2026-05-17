import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SEO from '@/components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BookOpen, Brain, ChevronRight, Download, Dumbbell, HeartPulse,
  Lock, Pill, ShieldCheck, Sparkles, Target, Trash2, User, Utensils, X,
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
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const T = {
  title: { ar: 'العافية', de: 'Wellness' },
  subtitle: { ar: 'بياناتك · خصوصيتك', de: 'Deine Daten · Privat' },
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
  // Dock labels
  premium: { ar: 'الأداء', de: 'Performance' },
  health: { ar: 'الصحة', de: 'Gesundheit' },
  // First-run onboarding
  welcomeTitle: { ar: 'مرحباً في العافية', de: 'Willkommen bei Wellness' },
  welcomeBody: {
    ar: 'نظام متكامل لتتبّع صحتك وأدائك الرياضي. كل بياناتك محلية وآمنة تماماً.',
    de: 'Ein vollständiges System für Gesundheit & sportliche Leistung. Alle Daten lokal & sicher.',
  },
  feat1: { ar: 'تتبّع التمارين والأرقام القياسية', de: 'Workouts & Rekorde tracken' },
  feat2: { ar: 'حاسبات متقدمة (BMR, TDEE, VO₂max, 1RM)', de: 'Profi-Rechner (BMR, TDEE, VO₂max, 1RM)' },
  feat3: { ar: 'نقاط التعافي والجاهزية الذكية', de: 'Intelligente Recovery & Readiness' },
  feat4: { ar: 'ترطيب، صيام، مكملات، وتغذية', de: 'Hydration, Fasten, Supplemente & Ernährung' },
  setupCta: { ar: 'إعداد الملف الشخصي', de: 'Profil einrichten' },
  later: { ar: 'لاحقاً', de: 'Später' },
};

interface TabDef {
  key: TabKey;
  labelAr: string;
  labelDe: string;
  icon: any;
  group: 0 | 1 | 2;
}

const TABS: TabDef[] = [
  { key: 'today',       labelAr: 'اليوم',     labelDe: 'Heute',    icon: Sparkles,  group: 0 },
  { key: 'workouts',    labelAr: 'التمارين',  labelDe: 'Training', icon: Dumbbell,  group: 0 },
  { key: 'hub',         labelAr: 'الأداء',    labelDe: 'Athletik', icon: Activity,  group: 0 },
  { key: 'goals',       labelAr: 'الأهداف',   labelDe: 'Ziele',    icon: Target,    group: 0 },
  { key: 'supplements', labelAr: 'المكملات',  labelDe: 'Supps',    icon: Pill,      group: 1 },
  { key: 'diet',        labelAr: 'التغذية',   labelDe: 'Essen',    icon: Utensils,  group: 1 },
  { key: 'vitals',      labelAr: 'العلامات',  labelDe: 'Vitale',   icon: HeartPulse,group: 1 },
  { key: 'skin',        labelAr: 'الجسد',     labelDe: 'Körper',   icon: User,      group: 1 },
  { key: 'insights',    labelAr: 'التحليلات', labelDe: 'Insights', icon: Brain,     group: 1 },
  { key: 'atlas',       labelAr: 'الأطلس',    labelDe: 'Atlas',    icon: BookOpen,  group: 1 },
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

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch { /* noop */ }
  }, [tab]);

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
    if (!window.confirm(T.wipeConfirm[language])) return;
    await data.wipe();
    setShowPrivacy(false);
    toast.success(T.wipeOk[language]);
  };

  const premiumTabs = TABS.filter((t) => t.group === 0);
  const healthTabs = TABS.filter((t) => t.group === 1);

  const renderTab = useCallback(() => {
    if (data.loading) {
      return (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl animate-pulse" style={{
              height: i === 1 ? 180 : i === 2 ? 120 : 160,
              background: 'linear-gradient(135deg, hsl(var(--muted)/0.4), hsl(var(--muted)/0.2))',
            }} />
          ))}
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
  }, [tab, data]);

  const currentTabDef = TABS.find((t) => t.key === tab);

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEO
        title={isAr ? 'الصحة والعافية — SmartHub' : 'Wellness — SmartHub'}
        description={isAr
          ? 'تطبيق العافية المتكامل: تمارين، حاسبات، تعافٍ، تغذية، مكملات — كل البيانات محلية وآمنة.'
          : 'Premium-Wellness-App: Workouts, Rechner, Recovery, Ernährung, Supplemente — alle Daten lokal.'}
        path="/wellness"
      />

      {/* ─── Ambient background gradient ─── */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }} />
        <div className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }} />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-lg mx-auto px-4 pt-8"
      >
        {/* ─── Premium Header ─── */}
        <motion.header variants={item} className="relative mb-5">
          <div className="flex items-center justify-between gap-3">
            <BackButton />
            <div className="flex-1 text-center min-w-0">
              <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
                {T.title[language]}
              </h1>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <Lock className="w-2.5 h-2.5 text-emerald-500" />
                <p className="text-[10px] font-medium text-muted-foreground/80 tracking-wide">
                  {T.subtitle[language]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTab('profile')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                  tab === 'profile'
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                }`}
                aria-label="Profile"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowPrivacy(true)}
                className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors"
                aria-label={T.privacy[language]}
              >
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.header>

        {/* ─── Dock-style Navigation ─── */}
        <motion.nav variants={item} className="mb-5 space-y-2">
          {/* Primary dock — premium tabs */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 shadow-[0_2px_24px_-8px_hsl(var(--primary)/0.08)]" />
            <div className="relative flex items-center gap-0.5 p-1.5 overflow-x-auto scrollbar-none" dir="ltr">
              {premiumTabs.map((t) => {
                const active = tab === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all duration-300 ${
                      active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="wellness-dock-active"
                        className="absolute inset-0 rounded-xl bg-primary shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[11.5px] font-semibold whitespace-nowrap">
                        {isAr ? t.labelAr : t.labelDe}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary dock — health/knowledge tabs */}
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-muted/30 border border-border/20" />
            <div className="relative flex items-center gap-0.5 p-1 overflow-x-auto scrollbar-none" dir="ltr">
              {healthTabs.map((t) => {
                const active = tab === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`relative shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-background text-primary shadow-sm border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="text-[10.5px] font-semibold whitespace-nowrap">
                      {isAr ? t.labelAr : t.labelDe}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.nav>

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          <motion.main
            key={tab}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderTab()}
          </motion.main>
        </AnimatePresence>
      </motion.div>

      {/* ─── Privacy modal (glass style) ─── */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-5"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-card/95 backdrop-blur-xl border border-border/50 p-6 space-y-4 overflow-hidden shadow-2xl"
            >
              {/* Glass top highlight */}
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5.5 h-5.5 text-emerald-500" />
                  </div>
                  <h3 className="text-[17px] font-bold text-foreground">{T.privacyTitle[language]}</h3>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-[13px] text-muted-foreground leading-relaxed">{T.privacyBody[language]}</p>

              <div className="space-y-2 pt-1">
                <button
                  onClick={handleExport}
                  className="w-full py-3 rounded-2xl bg-primary/10 text-primary text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-primary/15"
                >
                  <Download className="w-4 h-4" />
                  {T.exportData[language]}
                </button>
                <button
                  onClick={handleWipe}
                  className="w-full py-3 rounded-2xl bg-destructive/8 text-destructive text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-destructive/12"
                >
                  <Trash2 className="w-4 h-4" />
                  {T.wipe[language]}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Premium onboarding ─── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-5"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="relative w-full max-w-sm rounded-[28px] bg-card border border-border/40 overflow-hidden shadow-2xl"
            >
              {/* Aurora top glow */}
              <div aria-hidden className="absolute inset-x-0 top-0 h-40 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 70% 120% at 50% 0%, hsl(var(--primary)/0.2), transparent 70%)',
                }}
              />
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <div className="relative px-6 pt-8 pb-6 space-y-5">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-[20px] bg-primary/12 flex items-center justify-center ring-1 ring-primary/20">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                </div>

                {/* Text */}
                <div className="text-center space-y-2">
                  <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">
                    {T.welcomeTitle[language]}
                  </h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                    {T.welcomeBody[language]}
                  </p>
                </div>

                {/* Features list */}
                <ul className="space-y-2.5">
                  {[T.feat1[language], T.feat2[language], T.feat3[language], T.feat4[language]].map(
                    (txt, i) => {
                      const icons = [Dumbbell, Activity, HeartPulse, Target];
                      const colors = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b'];
                      const Icon = icons[i];
                      return (
                        <li key={i} className="flex items-center gap-3 text-[12.5px] text-foreground">
                          <span
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${colors[i]}15` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: colors[i] }} />
                          </span>
                          <span className="leading-snug font-medium">{txt}</span>
                        </li>
                      );
                    },
                  )}
                </ul>

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => dismissOnboarding(false)}
                    className="flex-1 py-3 rounded-2xl bg-muted/60 text-muted-foreground text-[13px] font-semibold hover:bg-muted/80 transition-colors"
                  >
                    {T.later[language]}
                  </button>
                  <button
                    onClick={() => dismissOnboarding(true)}
                    className="flex-[2] py-3 rounded-2xl bg-primary text-primary-foreground text-[13px] font-bold active:scale-[0.98] transition-transform shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
                  >
                    {T.setupCta[language]}
                    <ChevronRight className="w-4 h-4 inline-block ml-1 -mr-1" />
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
