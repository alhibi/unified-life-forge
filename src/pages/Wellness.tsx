import { AnimatePresence,motion } from 'framer-motion';
import React, { lazy, Suspense,useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import AuthGuard from '@/components/AuthGuard';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useWellnessData } from '@/features/wellness/useWellnessData';
import {
Activity,Apple,
  BookOpen, Brain, ChevronRight, Download, Dumbbell,
  Library, ShieldCheck, Trash2, Utensils, X,  } from '@/lib/icons';

// ── Lazy-loaded tabs ──────────────────────────────────────────────────
// Each tab drags in its own heavy static data (food catalog, skill tree,
// exercise library — thousands of lines each). Users typically only
// visit 1-2 tabs per session, so loading all seven up front wastes
// bandwidth and delays first paint. Lazy-loading + Suspense fallback
// makes the wellness page open ~5x faster and keeps subsequent tab
// switches instant once the module is cached.
const DietTab         = lazy(() => import('@/features/wellness/DietTab'));
const InsightsTab     = lazy(() => import('@/features/wellness/InsightsTab'));
const AtlasTab        = lazy(() => import('@/features/wellness/AtlasTab'));
const WorkoutsTab     = lazy(() => import('@/features/wellness/premium/WorkoutsTab'));
const CalisthenicsTab = lazy(() => import('@/features/wellness/premium/CalisthenicsTab'));
const EncyclopediaTab = lazy(() => import('@/features/wellness/EncyclopediaTab'));
const NutritionTab    = lazy(() =>
  import('@/features/wellness/nutrition/components').then(m => ({ default: m.NutritionTab })),
);
import { FitnessFeature } from '@/features/fitness';
import { exportAll } from '@/features/wellness/wellnessDb';
import { confirmDialog } from '@/lib/confirmDialog';

type TabKey =
  | 'workouts' | 'cali' | 'activity'
  | 'diet' | 'nutrition'
  | 'insights' | 'atlas' | 'encyclopedia';

const STORAGE_KEY = 'wellness:lastTab';

const T = {
  title: { ar: 'العافية', },
  privacy: { ar: 'الخصوصية', },
  privacyTitle: { ar: 'الخصوصية والتحكم', },
  privacyBody: {
    ar: 'بيانات العافية محفوظة في حسابك في السحابة، محمية بصلاحيات صارمة — لا يستطيع أحد غيرك رؤيتها أو تعديلها.',
  },
  exportData: { ar: 'تصدير بياناتي', },
  wipe: { ar: 'حذف جميع البيانات', },
  wipeConfirm: { ar: 'هل أنت متأكد؟ لا يمكن التراجع.', },
  close: { ar: 'إغلاق', },
  exportOk: { ar: 'تم التصدير بنجاح', },
  exportErr: { ar: 'فشل التصدير', },
  wipeOk: { ar: 'تم حذف جميع بيانات العافية', },
  welcomeTitle: { ar: 'مرحباً في العافية', },
  welcomeBody: {
    ar: 'نظام متكامل لتتبّع صحتك وأدائك الرياضي. كل بياناتك محفوظة في حسابك وآمنة تماماً.',
  },
  feat1: { ar: 'تتبّع التمارين والأرقام القياسية (1RM)', },
  feat2: { ar: 'تمارين كاليستنيكس متدرّجة', },
  feat3: { ar: 'تغذية وحساب الماكروز', },
  feat4: { ar: 'أطلس وموسوعة معرفية', },
  setupCta: { ar: 'استكشف الآن', },
  later: { ar: 'لاحقاً', },
  signInRequired: { ar: 'سجّل دخولك لاستخدام قسم العافية', },
  signInBody: {
    ar: 'قسم العافية بالكامل مرتبط بحسابك — التمارين، التغذية، المكملات، والأهداف تُحفظ في السحابة وتتزامن عبر أجهزتك.',
  },
  signInCta: { ar: 'تسجيل الدخول', },
};

interface TabDef {
  key: TabKey;
  labelAr: string;
  icon: any;
  group: 0 | 1 | 2;
}

const TABS: TabDef[] = [
  { key: 'workouts',    labelAr: 'التمارين',      icon: Dumbbell,   group: 0 },
  { key: 'cali',        labelAr: 'كاليستنيكس',  icon: Dumbbell,   group: 0 },
  { key: 'activity',    labelAr: 'تتبع الأنشطة',  icon: Activity,   group: 0 },
  { key: 'nutrition',   labelAr: 'التغذية الذكية', icon: Apple,   group: 1 },
  { key: 'diet',        labelAr: 'سجل الطعام',     icon: Utensils,   group: 1 },
  { key: 'insights',    labelAr: 'التحليلات',      icon: Brain,      group: 1 },
  { key: 'atlas',       labelAr: 'الأطلس',         icon: BookOpen,   group: 1 },
  { key: 'encyclopedia',labelAr: 'الموسوعة',        icon: Library,    group: 1 },
];

export default function WellnessPage() {
  const { language } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useWellnessData();

  const urlTab = searchParams.get('tab') as TabKey | null;

  const [tab, setTab] = useState<TabKey>(() => {
    if (urlTab && TABS.some(t => t.key === urlTab)) return urlTab;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TabKey | null;
      if (saved && TABS.some((t) => t.key === saved)) return saved;
    } catch { /* noop */ }
    return 'workouts';
  });

  // Sync tab with URL Query Parameters and localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch { /* noop */ }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  }, [tab, setSearchParams]);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);


  useEffect(() => {
    if (data.loading) return;
    if (data.profile) {
      // If the user already has a profile, mark the welcome as completed
      // so it never reappears even after a tab reload.
      try { localStorage.setItem('wellness:onboarded', '1'); } catch { /* noop */ }
      return;
    }
    try {
      const dismissed = localStorage.getItem('wellness:onboarded');
      if (dismissed) return;
    } catch { /* noop */ }
    setShowOnboarding(true);
  }, [data.loading, data.profile]);

  // Close any open sheet on Escape
  useEffect(() => {
    if (!showPrivacy && !showOnboarding) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowPrivacy(false);
      setShowOnboarding(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPrivacy, showOnboarding]);

  const dismissOnboarding = (gotoWorkouts: boolean) => {
    setShowOnboarding(false);
    try { localStorage.setItem('wellness:onboarded', '1'); } catch { /* noop */ }
    if (gotoWorkouts) setTab('workouts');
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
    const ok = await confirmDialog({
      message: T.wipeConfirm[language],
      confirmLabel: T.wipe[language],
      cancelLabel: T.close[language],
      destructive: true,
    });
    if (!ok) return;
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
      case 'activity':
        return (
          <div className="p-1">
            <AppCard className="p-6 text-center space-y-4 border-primary/20 bg-primary/5 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                <Activity className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 relative z-10">
                <h3 className="text-sm font-bold text-foreground">تطبيق اللياقة البدنية المتكامل</h3>
                <p className="text-[0.6875rem] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  لقد تمت ترقية قسم تتبع الأنشطة ليكون تطبيقاً مستقلاً متكاملاً مليئاً بالتفاصيل العميقة وجداول التمارين الأسبوعية، مؤقتات الاستراحة، حاسبات مؤشرات الوزن وحساب حرق السعرات الحرارية الدقيق.
                </p>
              </div>
              <Button
                onClick={() => navigate('/fitness')}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold active-tactile relative z-10"
              >
                افتح تطبيق اللياقة البدنية المستقل
                <ChevronRight className="w-3.5 h-3.5 ms-1.5 inline-block rtl:rotate-180" />
              </Button>
            </AppCard>
          </div>
        );
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
      case 'nutrition':
        return <NutritionTab />;
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
    <AuthGuard
      fallbackTitleAr="قسم الصحة والعافية"
      fallbackDescAr="يرجى تسجيل الدخول للوصول إلى برامج التمرين والتحليلات الصحية ومزامنتها سحابياً."
    >
      <div className="min-h-screen bg-background pb-page">
      <SEO
        title={'الصحة والعافية — SmartHub'}
        description={'تطبيق العافية: تمارين، كاليستنيكس، تغذية، أطلس، وموسوعة — كل البيانات محلية وآمنة.'}
        path="/wellness"
      />

      <div className="max-w-lg mx-auto px-3 pt-6">
        {/* ─── Minimal Header ─── */}
        {/* No back button: /wellness is a top-level bottom-nav tab.
            Showing one would conflict with the tab contract (the user
            already has the bottom bar to switch destinations) and pull
            them to wherever they happened to come from. The privacy
            shortcut stays on the right. */}
        <header className="flex items-center justify-between mb-3">
          <h1 className="text-[1.0625rem] font-medium tracking-tight text-foreground">
            {T.title[language]}
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPrivacy(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={T.privacy[language]}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ─── Refined dock navigation ─── */}
        <nav className="mb-3" aria-label="wellness sections">
          <div
            className="bg-card border border-border rounded-xl p-1 flex items-center gap-0.5 overflow-x-auto scrollbar-none"
            dir="ltr"
          >
            {TABS.map((t, i) => {
              const active = tab === t.key;
              const Icon = t.icon;
              const isFirstOfGroup =
                i > 0 && TABS[i - 1].group !== t.group;
              return (
                <React.Fragment key={t.key}>
                  {isFirstOfGroup && (
                    <span
                      aria-hidden
                      className="shrink-0 self-stretch w-px mx-0.5 bg-border/40"
                    />
                  )}
                  <button
                    onClick={() => setTab(t.key)}
                    aria-pressed={active}
                    aria-label={t.labelAr}
                    className={`relative shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg transition-colors duration-150 ${
                      active
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="wellness-dock-pill"
                        className="absolute inset-0 rounded-lg bg-primary "
                        transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span className="relative inline-flex items-center gap-1.5">
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.4 : 2} />
                      <span
                        className={`text-[0.75rem] font-semibold whitespace-nowrap leading-none ${
                          active ? '' : 'tracking-tight'
                        }`}
                      >
                        {t.labelAr}
                      </span>
                    </span>
                  </button>
                </React.Fragment>
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
            <Suspense
              fallback={
                <div className="space-y-2 pt-1">
                  <div className="h-20 rounded-xl animate-pulse bg-muted/30" />
                  <div className="h-16 rounded-xl animate-pulse bg-muted/20" />
                  <div className="h-20 rounded-xl animate-pulse bg-muted/25" />
                </div>
              }
            >
              {renderTab()}
            </Suspense>
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
            className="fixed inset-0 z-drawer flex items-end justify-center bg-black/60"
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
                  <h3 className="text-[0.8125rem] font-medium text-foreground">{T.privacyTitle[language]}</h3>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              <p className="text-[0.6875rem] text-muted-foreground leading-relaxed">{T.privacyBody[language]}</p>

              <div className="space-y-1.5">
                <button
                  onClick={handleExport}
                  className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[0.6875rem] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <Download className="w-3 h-3" />
                  {T.exportData[language]}
                </button>
                <button
                  onClick={handleWipe}
                  className="w-full py-2 rounded-xl bg-destructive/8 text-destructive text-[0.6875rem] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
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
            className="fixed inset-0 z-drawer flex items-center justify-center bg-black/60 px-4"
            onClick={() => dismissOnboarding(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wellness-welcome-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs rounded-2xl bg-card border border-border/40 p-5 space-y-4"
            >
              <button
                onClick={() => dismissOnboarding(false)}
                className="absolute top-2 end-2 w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label={T.close[language]}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <h2
                  id="wellness-welcome-title"
                  className="text-[0.9375rem] font-medium text-foreground"
                >
                  {T.welcomeTitle[language]}
                </h2>
                <p className="text-[0.6875rem] text-muted-foreground leading-relaxed">
                  {T.welcomeBody[language]}
                </p>
              </div>

              <ul className="space-y-1.5">
                {[T.feat1[language], T.feat2[language], T.feat3[language], T.feat4[language]].map(
                  (txt, i) => {
                    const icons = [Dumbbell, Dumbbell, Utensils, Library];
                    const Icon = icons[i];
                    return (
                      <li key={i} className="flex items-center gap-2 text-[0.625rem] text-foreground/80">
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
                  className="flex-1 py-2 rounded-xl bg-muted/50 text-muted-foreground text-[0.6875rem] font-medium hover:bg-muted/70 transition-colors"
                >
                  {T.later[language]}
                </button>
                <button
                  onClick={() => dismissOnboarding(true)}
                  className="flex-[2] py-2 rounded-xl bg-primary text-primary-foreground text-[0.6875rem] font-medium active:scale-[0.98] transition-transform"
                >
                  {T.setupCta[language]}
                  <ChevronRight className="w-3 h-3 inline-block ms-0.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </AuthGuard>
  );
}
