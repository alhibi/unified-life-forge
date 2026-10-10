/**
 * Wellness hub page.
 *
 * System-unification pass:
 *   • The bespoke header became <PageHeader hideBack> — /wellness is a
 *     top-level destination, so no back affordance.
 *   • The privacy sheet and the welcome modal became <ResponsiveDrawer>
 *     surfaces backed by AppList/AppRow: no bespoke scrim, no hand-rolled
 *     card chrome, no duplicated close buttons.
 *   • The section dock keeps its sliding pill, but its container is the
 *     canonical card surface (<AppCard>) instead of a hand-written
 *     card-chrome combo.
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import AuthGuard from '@/components/AuthGuard';
import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import {
  AppCard,
  AppList,
  AppRow,
  IconButton,
  IconChip,
  PageShell,
} from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { useApp } from '@/contexts/AppContext';
import { useWellnessData } from '@/features/wellness/useWellnessData';
import { exportAll } from '@/features/wellness/wellnessDb';
import { confirmDialog } from '@/lib/confirmDialog';
import {
  Activity,
  Apple,
  BookOpen,
  Brain,
  ChevronLeft,
  Download,
  Dumbbell,
  Library,
  LucideIcon,
  ShieldCheck,
  Trash2,
  Utensils,
} from '@/lib/icons';

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
};

const FEATURE_ICONS = [Dumbbell, Dumbbell, Utensils, Library] as const;

interface TabDef {
  key: TabKey;
  labelAr: string;
  icon: LucideIcon;
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
    // Same guard as /mihrab: writing an identical URL from inside an effect
    // re-renders and re-runs the effect, chasing itself forever and starving
    // every timer on the thread.
    if (searchParams.get('tab') === tab) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  }, [tab, searchParams, setSearchParams]);
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
            <AppCard className="p-6 text-center space-y-4">
              <IconChip size="xl" className="mx-auto">
                <Activity className="h-7 w-7" aria-hidden />
              </IconChip>
              <div className="space-y-1.5">
                <h2 className="text-meta font-bold text-foreground">تطبيق اللياقة البدنية المتكامل</h2>
                <p className="text-micro text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  لقد تمت ترقية قسم تتبع الأنشطة ليكون تطبيقاً مستقلاً متكاملاً مليئاً بالتفاصيل العميقة وجداول التمارين الأسبوعية، مؤقتات الاستراحة، حاسبات مؤشرات الوزن وحساب حرق السعرات الحرارية الدقيق.
                </p>
              </div>
              <Button onClick={() => navigate('/fitness')} className="w-full">
                افتح تطبيق اللياقة البدنية المستقل
                <ChevronLeft className="h-4 w-4" aria-hidden />
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
      <PageShell className="pt-6">
        <SEO
          title={'الصحة والعافية — SmartHub'}
          description={'تطبيق العافية: تمارين، كاليستنيكس، تغذية، أطلس، وموسوعة — كل البيانات محلية وآمنة.'}
          path="/wellness"
        />

        {/* Header — top-level destination, so no back affordance; the
            privacy shortcut lives in the actions slot. */}
        <PageHeader
          title={T.title[language]}
          hideBack
          right={
            <IconButton
              onClick={() => setShowPrivacy(true)}
              aria-label={T.privacy[language]}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </IconButton>
          }
        />

        {/* Section dock — grouped tab rail with a sliding active pill. */}
        <nav aria-label="wellness sections">
          <AppCard
            className="flex items-center gap-0.5 overflow-x-auto p-1 scrollbar-none"
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
                    className={`relative shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg transition-colors duration-fast ${
                      active
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="wellness-dock-pill"
                        className="absolute inset-0 rounded-lg bg-primary"
                        transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span className="relative inline-flex items-center gap-1.5">
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.4 : 2} />
                      <span
                        className={`text-mini font-semibold whitespace-nowrap leading-none ${
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
          </AppCard>
        </nav>

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          <motion.section
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
          </motion.section>
        </AnimatePresence>
      </PageShell>

      {/* ─── Privacy drawer ─── */}
      <ResponsiveDrawer
        open={showPrivacy}
        onOpenChange={setShowPrivacy}
        title={T.privacyTitle[language]}
        description={T.privacyBody[language]}
      >
        <AppList>
          <AppRow
            onClick={handleExport}
            leading={
              <IconChip tone="plain" aria-hidden>
                <Download className="h-5 w-5" />
              </IconChip>
            }
            title={T.exportData[language]}
          />
          <AppRow
            tone="danger"
            onClick={handleWipe}
            leading={
              <IconChip tone="danger" aria-hidden>
                <Trash2 className="h-5 w-5" />
              </IconChip>
            }
            title={T.wipe[language]}
          />
        </AppList>
      </ResponsiveDrawer>

      {/* ─── Welcome drawer ─── */}
      <ResponsiveDrawer
        open={showOnboarding}
        onOpenChange={(open) => {
          if (!open) dismissOnboarding(false);
        }}
        title={T.welcomeTitle[language]}
        description={T.welcomeBody[language]}
      >
        <AppList>
          {[T.feat1[language], T.feat2[language], T.feat3[language], T.feat4[language]].map(
            (txt, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <AppRow
                  key={i}
                  as="div"
                  leading={
                    <IconChip tone="plain" aria-hidden>
                      <Icon className="h-5 w-5" />
                    </IconChip>
                  }
                  title={txt}
                />
              );
            },
          )}
        </AppList>

        <div className="flex gap-3 pt-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => dismissOnboarding(false)}
          >
            {T.later[language]}
          </Button>
          <Button
            className="flex-[2]"
            onClick={() => dismissOnboarding(true)}
          >
            {T.setupCta[language]}
          </Button>
        </div>
      </ResponsiveDrawer>
    </AuthGuard>
  );
}
