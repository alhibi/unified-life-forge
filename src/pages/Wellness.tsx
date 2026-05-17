import React, { useState, useEffect, useCallback } from 'react';
import SEO from '@/components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BookOpen, Brain, ChevronRight, Download, Dumbbell, HeartPulse,
  Library, Pill, ShieldCheck, Sparkles, Target, Trash2, User, Utensils, X,
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
import CalisthenicsTab from '@/features/wellness/premium/CalisthenicsTab';
import EncyclopediaTab from '@/features/wellness/EncyclopediaTab';

import { exportAll } from '@/features/wellness/wellnessDb';

type TabKey =
  | 'today' | 'workouts' | 'cali' | 'hub' | 'goals'
  | 'supplements' | 'diet' | 'vitals' | 'skin'
  | 'insights' | 'atlas' | 'encyclopedia' | 'profile';

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
  welcomeTitle: { ar: 'مرحباً في العافية', de: 'Willkommen bei Wellness' },
  welcomeBody: {
    ar: 'نظام متكامل لتتبّع صحتك وأدائك الرياضي. كل بياناتك محلية وآمنة تماماً.',
    de: 'Gesundheit & sportliche Leistung. Alle Daten lokal & sicher.',
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
  { key: 'today',       labelAr: 'اليوم',        labelDe: 'Heute',         icon: Sparkles,   group: 0 },
  { key: 'workouts',    labelAr: 'التمارين',     labelDe: 'Training',      icon: Dumbbell,   group: 0 },
  { key: 'cali',        labelAr: 'كاليستنيكس',   labelDe: 'Calisthenics',  icon: Dumbbell,   group: 0 },
  { key: 'hub',         labelAr: 'الأداء',       labelDe: 'Athletik',      icon: Activity,   group: 0 },
  { key: 'goals',       labelAr: 'الأهداف',      labelDe: 'Ziele',         icon: Target,     group: 0 },
  { key: 'supplements', labelAr: 'المكملات',     labelDe: 'Supps',         icon: Pill,       group: 1 },
  { key: 'diet',        labelAr: 'التغذية',      labelDe: 'Essen',         icon: Utensils,   group: 1 },
  { key: 'vitals',      labelAr: 'العلامات',     labelDe: 'Vitale',        icon: HeartPulse, group: 1 },
  { key: 'skin',        labelAr: 'الجسد',        labelDe: 'Körper',        icon: User,       group: 1 },
  { key: 'insights',    labelAr: 'التحليلات',    labelDe: 'Insights',      icon: Brain,      group: 1 },
  { key: 'atlas',       labelAr: 'الأطلس',       labelDe: 'Atlas',         icon: BookOpen,   group: 1 },
  { key: 'encyclopedia',labelAr: 'الموسوعة',     labelDe: 'Wissen',        icon: Library,    group: 1 },
  { key: 'profile',     labelAr: 'ملفّي',        labelDe: 'Profil',        icon: User,       group: 2 },
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
        <div className="space-y-2 pt-1">
          <div className="h-20 rounded-xl animate-pulse bg-muted/30" />
          <div className="h-16 rounded-xl animate-pulse bg-muted/20" />
          <div className="h-20 rounded-xl animate-pulse bg-muted/25" />
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
      case 'cali':
        return <CalisthenicsTab />;
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
      case 'encyclopedia':
        return <EncyclopediaTab />;
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab('profile')}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                tab === 'profile'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label="Profile"
            >
              <User className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={T.privacy[language]}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ─── Ultra-compact Dock Navigation ─── */}
        <nav className="mb-3 space-y-1.5">
          {/* Primary dock — icons only, pill bar */}
          <div className="bg-card border border-border/40 rounded-xl p-1 flex items-center gap-px overflow-x-auto scrollbar-none" dir="ltr">
            {premiumTabs.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative shrink-0 h-[28px] px-2.5 flex items-center gap-1 rounded-lg transition-all duration-200 ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="wellness-dock-primary"
                      className="absolute inset-0 rounded-lg bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1">
                    <Icon className="w-[9px] h-[9px]" />
                    <span className="text-[9px] font-medium whitespace-nowrap">
                      {isAr ? t.labelAr : t.labelDe}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary dock — tiny text buttons, no container bg */}
          <div className="flex items-center gap-px overflow-x-auto scrollbar-none" dir="ltr">
            {healthTabs.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 h-[28px] px-2 flex items-center gap-0.5 rounded-lg transition-all duration-150 ${
                    active
                      ? 'bg-muted/60 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-[9px] h-[9px]" />
                  <span className="text-[9px] font-medium whitespace-nowrap">
                    {isAr ? t.labelAr : t.labelDe}
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

      {/* ─── Minimal onboarding modal ─── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-xs rounded-2xl bg-card border border-border/40 p-5 space-y-4"
            >
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-[15px] font-medium text-foreground">
                  {T.welcomeTitle[language]}
                </h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {T.welcomeBody[language]}
                </p>
              </div>

              <ul className="space-y-1.5">
                {[T.feat1[language], T.feat2[language], T.feat3[language], T.feat4[language]].map(
                  (txt, i) => {
                    const icons = [Dumbbell, Activity, HeartPulse, Target];
                    const Icon = icons[i];
                    return (
                      <li key={i} className="flex items-center gap-2 text-[10px] text-foreground/80">
                        <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="font-medium">{txt}</span>
                      </li>
                    );
                  },
                )}
              </ul>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => dismissOnboarding(false)}
                  className="flex-1 py-2 rounded-xl bg-muted/50 text-muted-foreground text-[11px] font-medium hover:bg-muted/70 transition-colors"
                >
                  {T.later[language]}
                </button>
                <button
                  onClick={() => dismissOnboarding(true)}
                  className="flex-[2] py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-medium active:scale-[0.98] transition-transform"
                >
                  {T.setupCta[language]}
                  <ChevronRight className="w-3 h-3 inline-block ml-0.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
