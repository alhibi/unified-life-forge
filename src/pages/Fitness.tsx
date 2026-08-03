import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef,useState } from 'react';

// UI Primitives & Layout
import { AppCard, PageShell, Section } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { useApp } from '@/contexts/AppContext';
import { FullActivityMap } from '@/features/fitness/FullActivityMap';
import { RouteThumbnail } from '@/features/fitness/RouteThumbnail';
// Fitness Feature hooks & components
import { useActivityTracking } from '@/features/fitness/useActivityTracking';
// Standard Icons
import {
  Activity,
  BarChart3,
  Calendar,
  Check,
  Clock,
  Dumbbell,
  History,
  Info,
  Library,
  Play,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
  Trash2,
  X,
} from '@/lib/icons';
// Custom Fitness App Zustand Store
import {
  DayOfWeekKey,
  useFitnessAppStore,
} from '@/stores/fitnessAppStore';

// ============================================================================
// Static Data - Exercise Dictionary
// ============================================================================

interface StaticExercise {
  key: string;
  name: string;
  muscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';
  equipment: string;
  difficulty: 'مبتدئ' | 'متوسط' | 'متقدم';
  desc: string;
  estimatedCaloriesPerMin: number;
}

const STATIC_EXERCISES: StaticExercise[] = [
  { key: 'bench-press', name: 'بنش بريس بالبار (Bench Press)', muscle: 'chest', equipment: 'بار، بنش مستوي', difficulty: 'متوسط', desc: 'تمرين أساسي لبناء عضلات الصدر والقوة العامة للجزء العلوي من الجسم.', estimatedCaloriesPerMin: 7 },
  { key: 'pushup', name: 'تمرين الضغط الكلاسيكي (Pushup)', muscle: 'chest', equipment: 'وزن الجسم', difficulty: 'مبتدئ', desc: 'تمرين ممتاز للجزء العلوي يستهدف الصدر، الترايسبس، والأكتاف.', estimatedCaloriesPerMin: 5 },
  { key: 'pullup', name: 'تمرين العقلة (Pull-up)', muscle: 'back', equipment: 'عقلة', difficulty: 'متقدم', desc: 'تمرين جبار لبناء عرض وعضلات الظهر بأكملها وقوة القبضة.', estimatedCaloriesPerMin: 8 },
  { key: 'lat-pulldown', name: 'سحب ظهر واسع (Lat Pulldown)', muscle: 'back', equipment: 'جهاز السحب الكيبل', difficulty: 'مبتدئ', desc: 'يستهدف عضلات الظهر العريضة وهو بديل رائع للمبتدئين عن العقلة.', estimatedCaloriesPerMin: 5 },
  { key: 'squat', name: 'قرفصاء بالبار (Barbell Squat)', muscle: 'legs', equipment: 'بار، حامل الأوزان', difficulty: 'متوسط', desc: 'ملك تمارين الأرجل، يبني القوة في الكوادز والأرداف والجذع.', estimatedCaloriesPerMin: 10 },
  { key: 'leg-press', name: 'جهاز دفع الأرجل (Leg Press)', muscle: 'legs', equipment: 'آلة دفع الأرجل', difficulty: 'مبتدئ', desc: 'تمرين آمن وعزل قوي لبناء عضلات الفخذ الأمامية والخلفية.', estimatedCaloriesPerMin: 6 },
  { key: 'overhead-press', name: 'ضغط أكتاف واقف بالبار (Overhead Press)', muscle: 'shoulders', equipment: 'بار', difficulty: 'متوسط', desc: 'تمرين رائع لزيادة القوة وبناء الأكتاف والجزء العلوي.', estimatedCaloriesPerMin: 7 },
  { key: 'lateral-raise', name: 'رفرفة جانبي بالدمبلز (Lateral Raise)', muscle: 'shoulders', equipment: 'دمبلز', difficulty: 'مبتدئ', desc: 'يعزل عضلة الكتف الجانبية للحصول على مظهر عريض وجميل.', estimatedCaloriesPerMin: 4 },
  { key: 'bicep-curl', name: 'تبادل بايسبس بالدمبلز (Dumbbell Bicep Curl)', muscle: 'arms', equipment: 'دمبلز', difficulty: 'مبتدئ', desc: 'تمرين كلاسيكي لعزل وتكوير عضلات البايسبس.', estimatedCaloriesPerMin: 4 },
  { key: 'tricep-pushdown', name: 'سحب ترايسبس بالكيبل (Tricep Pushdown)', muscle: 'arms', equipment: 'جهاز الكيبل', difficulty: 'مبتدئ', desc: 'يستهدف الرؤوس الثلاثية لعضلة الترايسبس لإعطاء حجم للذراع.', estimatedCaloriesPerMin: 4 },
  { key: 'crunch', name: 'تمرين طحن البطن (Abdominal Crunch)', muscle: 'core', equipment: 'وزن الجسم', difficulty: 'مبتدئ', desc: 'تمرين كلاسيكي يستهدف عضلات البطن العلوية بالتحديد.', estimatedCaloriesPerMin: 3 },
  { key: 'plank', name: 'تمرين لوح الخشب (Plank)', muscle: 'core', equipment: 'وزن الجسم', difficulty: 'مبتدئ', desc: 'يبني قوة تحمل جبارة في الجذع وعضلات البطن والظهر.', estimatedCaloriesPerMin: 4 },
  { key: 'deadlift', name: 'الرفعة المميتة بالبار (Deadlift)', muscle: 'back', equipment: 'بار، أقراص أوزان', difficulty: 'متقدم', desc: 'أقوى تمرين للجسم بأكمله، يستهدف عضلات الظهر، الأرجل الخلفية، والأرداف.', estimatedCaloriesPerMin: 11 },
];

const MUSCLE_GROUPS_AR = {
  all: 'الكل',
  chest: 'الصدر',
  back: 'الظهر',
  legs: 'الأرجل',
  shoulders: 'الأكتاف',
  arms: 'الذراعين',
  core: 'البطن والجذع',
};

const DAYS_MAP: Record<DayOfWeekKey, { ar: string; short: string }> = {
  sat: { ar: 'السبت', short: 'سبت' },
  sun: { ar: 'الأحد', short: 'أحد' },
  mon: { ar: 'الإثنين', short: 'إثنين' },
  tue: { ar: 'الثلاثاء', short: 'ثلاثاء' },
  wed: { ar: 'الأربعاء', short: 'أربعاء' },
  thu: { ar: 'الخميس', short: 'خميس' },
  fri: { ar: 'الجمعة', short: 'جمعة' },
};

// ============================================================================
// State Interface for UI Actions
// ============================================================================

interface FitnessPageStateProps {
  selectedDay: DayOfWeekKey;
  setSelectedDay: (day: DayOfWeekKey) => void;
  addExerciseOpen: boolean;
  setAddExerciseOpen: (open: boolean) => void;
  exerciseSearch: string;
  setExerciseSearch: (search: string) => void;
  libraryFilter: string;
  setLibraryFilter: (filter: string) => void;
  librarySearch: string;
  setLibrarySearch: (search: string) => void;
  logWeightKg: string;
  setLogWeightKg: (w: string) => void;
  logBodyFat: string;
  setLogBodyFat: (bf: string) => void;
  logDate: string;
  setLogDate: (d: string) => void;
  selectedMapActivity: any;
  setSelectedMapActivity: (act: any) => void;
  filteredExercises: StaticExercise[];
}

function FitnessPageInner({
  selectedDay,
  setSelectedDay,
  addExerciseOpen,
  setAddExerciseOpen,
  exerciseSearch,
  setExerciseSearch,
  libraryFilter,
  setLibraryFilter,
  librarySearch,
  setLibrarySearch,
  logWeightKg,
  setLogWeightKg,
  logBodyFat,
  setLogBodyFat,
  logDate,
  setLogDate,
  selectedMapActivity,
  setSelectedMapActivity,
  filteredExercises,
}: FitnessPageStateProps) {
  const { language } = useApp();

  // Active tracking hook (DeviceMotion/Capacitor GPS precision tracker)
  const tracker = useActivityTracking();

  // Zustand state stores
  const store = useFitnessAppStore();

  const [activeTab, setActiveTab] = useState<string>(() => store.lastActiveTab || 'dashboard');

  useEffect(() => {
    store.setLastActiveTab(activeTab);
  }, [activeTab]);

  // Rest Timer Local states
  const [restDuration, setRestDuration] = useState<number>(0); // remaining seconds
  const [restInitial, setRestInitial] = useState<number>(60); // configured rest duration
  const [isResting, setIsResting] = useState<boolean>(false);
  const restTimerRef = useRef<any>(null);

  const startRestTimer = (seconds: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestInitial(seconds);
    setRestDuration(seconds);
    setIsResting(true);

    // Audio synthesis context to provide dynamic physical click on rest trigger
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch { /* ignored */ }

    restTimerRef.current = setInterval(() => {
      setRestDuration((prev) => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current);
          setIsResting(false);
          // Play a finished beep
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch { /* ignored */ }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelRestTimer = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    setRestDuration(0);
  };

  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  return (
    <PageShell className="pb-page" style={{ position: 'relative' }}>
      {/* Dynamic Ambient Glow overlay matching Zen Elite System */}
      <div
        className="fixed top-0 left-0 right-0 h-64 pointer-events-none z-base"
        style={{
          background: 'radial-gradient(circle at 50% 0%, hsl(100, 40%, 45%, 0.12) 0%, transparent 60%)'
        }}
      />

      {/* Standalone Header */}
      <header className="flex items-center justify-between py-4 relative z-10 border-b border-border/40 mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(100,40%,45%)]/15 flex items-center justify-center text-[hsl(100,40%,45%)]">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-cormorant-garamond tracking-wide leading-tight text-foreground">اللياقة النخبوية</h1>
            <p className="text-[0.625rem] text-muted-foreground font-medium uppercase tracking-wider">PREMIUM LEICA WORKOUT SUITE</p>
          </div>
        </div>

        {/* Global Reset settings button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (confirm('هل ترغب في إعادة ضبط جميع بيانات وجداول اللياقة البدنية والعودة للحالة الافتراضية؟')) {
              store.clearAllFitnessAppData();
            }
          }}
          className="h-8 w-8 text-muted-foreground hover:text-foreground active-tactile"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </header>

      {/* Main Subsections Navigation Bar */}
      <nav className="flex items-center gap-0.5 p-1 bg-card border border-border/40 rounded-xl overflow-x-auto scrollbar-none mb-6 relative z-10">
        {[
          { id: 'dashboard', label: 'الرئيسية', icon: Activity },
          { id: 'timetable', label: 'جداول التمارين', icon: Calendar },
          { id: 'library', label: 'مكتبة التمارين', icon: Library },
          { id: 'progress', label: 'مؤشرات الجسم', icon: Scale },
          { id: 'history', label: 'سجل الأنشطة', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative shrink-0 flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all active-tactile ${
                active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="active-fitness-nav-pill"
                  className="absolute inset-0 rounded-lg bg-[hsl(100,40%,42%)] shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Floating Rest Timer Widget */}
      <AnimatePresence>
        {isResting && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-drawer bg-card border border-primary/20 rounded-2xl shadow-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin flex items-center justify-center relative">
                <Clock className="w-5 h-5 text-primary absolute" />
              </div>
              <div>
                <p className="text-[0.625rem] text-primary font-bold uppercase tracking-wider">مؤقت الاستراحة والاستشفاء</p>
                <p className="text-xl font-mono font-bold tabular-nums text-foreground">
                  {Math.floor(restDuration / 60)}:{(restDuration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => startRestTimer(restDuration + 30)} className="h-8 px-2.5 text-xs">
                +30ث
              </Button>
              <Button size="sm" variant="destructive" onClick={cancelRestTimer} className="h-8 w-8 p-0 flex items-center justify-center">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Contents */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Daily Interactive Metrics (Water, Steps, Calories) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Daily Hydration Log */}
                <AppCard className="p-4 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[0.6875rem] text-muted-foreground font-bold uppercase tracking-wide">شرب الماء اليومي</span>
                      <span className="text-xs text-blue-500 font-mono font-bold">
                        {(store.waterLogs[new Date().toISOString().split('T')[0]] || 0)} / {store.dailyWaterTargetMl} مل
                      </span>
                    </div>

                    {/* Progress visual water cylinder */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((store.waterLogs[new Date().toISOString().split('T')[0]] || 0) / store.dailyWaterTargetMl) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {[250, 500, 750].map((ml) => (
                      <Button
                        key={ml}
                        variant="outline"
                        size="sm"
                        onClick={() => store.addWater(new Date().toISOString().split('T')[0], ml)}
                        className="flex-1 text-[0.6875rem] h-8 font-mono font-bold hover:bg-blue-500/10 hover:text-blue-500"
                      >
                        +{ml}ml
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => store.resetWater(new Date().toISOString().split('T')[0])}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:border-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </AppCard>

                {/* 2. Steps Metric (DeviceMotion based fallback) */}
                <AppCard className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.6875rem] text-muted-foreground font-bold uppercase tracking-wide">النشاط الحركي اليومي</span>
                    <span className="text-[0.625rem] text-primary font-bold">نشط</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold font-mono text-foreground tracking-tighter tabular-nums">
                      {tracker.autoDetectEnabled ? 'مفعّل' : 'معطّل'}
                    </span>
                    <span className="text-xs text-muted-foreground">التتبع التلقائي</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[0.625rem] text-muted-foreground">التسارع الحالي</span>
                    <span className="text-xs font-mono font-bold tabular-nums text-foreground">{tracker.accelMagnitude} m/s²</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tracker.toggleAutoDetect(!tracker.autoDetectEnabled)}
                    className="mt-3 text-[0.6875rem] h-7 w-full border border-border/50 text-muted-foreground hover:text-foreground"
                  >
                    {tracker.autoDetectEnabled ? 'إيقاف تتبع الحركة' : 'تفعيل تتبع الحركة التلقائي'}
                  </Button>
                </AppCard>

                {/* 3. Calories Metric (Historical totals + live tracked) */}
                <AppCard className="p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[0.6875rem] text-muted-foreground font-bold uppercase tracking-wide">السعرات المحروقة اليوم</span>
                    <div className="flex items-baseline gap-1 mt-1 mb-2">
                      <span className="text-3xl font-bold font-mono text-[hsl(100,40%,45%)] tracking-tighter tabular-nums">
                        {Math.floor(tracker.calories)}
                      </span>
                      <span className="text-xs text-muted-foreground">سعرة حرارية</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[0.625rem] text-muted-foreground pt-2 border-t border-border/40">
                    <span>معدل الحركة اليوم</span>
                    <span className="font-mono font-bold text-foreground">
                      {tracker.motionState === 'running' ? 'جري 🏃‍♂️' : tracker.motionState === 'walking' ? 'مشي 🚶‍♂️' : 'استراحة 🛌'}
                    </span>
                  </div>
                </AppCard>
              </div>

              {/* Live Activity Precision Tracker Panel */}
              <Section label="تتبع الأنشطة الحية (GPS)">
                <AppCard className="relative overflow-hidden border-primary/20 bg-primary/5">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="p-6 flex flex-col items-center justify-center text-center z-base relative">
                    {tracker.isTracking ? (
                      <div className="w-full space-y-6">
                        {/* Live activity pulsing badge */}
                        <div className="flex justify-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[0.6875rem] font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            جاري تتبع النشاط: {tracker.activityType === 'running' ? 'جري' : 'مشي'}
                          </span>
                        </div>

                        {/* Large real-time telemetry metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                          <div className="text-center">
                            <p className="text-[0.625rem] text-muted-foreground font-bold uppercase tracking-wide">المسافة</p>
                            <p className="text-3xl font-bold font-mono text-foreground tracking-tighter tabular-nums mt-1">
                              {(tracker.distanceMeters / 1000).toFixed(2)} <span className="text-xs text-muted-foreground">كم</span>
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[0.625rem] text-muted-foreground font-bold uppercase tracking-wide">الوقت المنقضي</p>
                            <p className="text-3xl font-bold font-mono text-foreground tracking-tighter tabular-nums mt-1">
                              {Math.floor(tracker.durationSeconds / 60)}:{(tracker.durationSeconds % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[0.625rem] text-muted-foreground font-bold uppercase tracking-wide">السرعة الحالية</p>
                            <p className="text-3xl font-bold font-mono text-foreground tracking-tighter tabular-nums mt-1">
                              {tracker.currentSpeedMps.toFixed(1)} <span className="text-xs text-muted-foreground">م/ث</span>
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[0.625rem] text-muted-foreground font-bold uppercase tracking-wide">السعرات التقديرية</p>
                            <p className="text-3xl font-bold font-mono text-foreground tracking-tighter tabular-nums mt-1">
                              {Math.floor(tracker.calories)} <span className="text-xs text-muted-foreground">Kcal</span>
                            </p>
                          </div>
                        </div>

                        {/* Route Line Drawing Preview in Real-time */}
                        {tracker.route.length > 1 && (
                          <div className="h-24 bg-card/40 border border-border/20 rounded-xl p-2 flex items-center justify-center">
                            <RouteThumbnail route={tracker.route} height={80} />
                          </div>
                        )}

                        {/* Tracker Control Actions */}
                        <div className="flex gap-3 justify-center">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={tracker.togglePause}
                            className="flex-1 rounded-xl font-bold active-tactile"
                          >
                            {tracker.isPaused ? 'استئناف' : 'إيقاف مؤقت'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="lg"
                            onClick={tracker.stopTracking}
                            className="flex-1 rounded-xl font-bold active-tactile"
                          >
                            إيقاف وحفظ النشاط
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                          <Play className="w-8 h-8 ms-1" />
                        </div>
                        <h3 className="text-lg font-bold">جاهز لبدء تمرين هوائي؟</h3>
                        <p className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed">
                          قم بتسجيل وتتبع مساراتك عبر النظام الجغرافي الدقيق للـ GPS، وحلل سرعتك وأوقات الاستجابة مع حماية مدمجة ضد انقطاعات التتبع.
                        </p>

                        <div className="flex gap-3 justify-center pt-2">
                          <Button
                            onClick={() => tracker.startTracking('manual', 'walking')}
                            className="rounded-xl px-6 font-bold bg-[hsl(100,40%,42%)] hover:bg-[hsl(100,40%,38%)]"
                          >
                            بدء تتبع مشي
                          </Button>
                          <Button
                            onClick={() => tracker.startTracking('manual', 'running')}
                            className="rounded-xl px-6 font-bold bg-[hsl(100,40%,42%)] hover:bg-[hsl(100,40%,38%)]"
                          >
                            بدء تتبع جري
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </AppCard>
              </Section>

              {/* Developer / Testing Simulator Console */}
              <Section label="لوحة التحكم والمحاكاة للياقة البدنية (Simulation Console)">
                <AppCard className="p-4 border border-border/60 bg-muted/5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" /> وضع المحاكاة والاختبار
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">مخصص لمحاكاة أنشطة اللياقة البدنية والسرعة والمسار مباشرة بدون الخروج بالهاتف.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={tracker.isSimulated ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => tracker.setIsSimulated(!tracker.isSimulated)}
                        className="text-[0.6875rem] font-bold h-8"
                      >
                        {tracker.isSimulated ? 'المحاكاة مفعّلة' : 'تفعيل المحاكاة'}
                      </Button>
                    </div>
                  </div>

                  {tracker.isSimulated && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/40">
                      <div>
                        <p className="text-[0.625rem] text-muted-foreground font-bold uppercase mb-2">1. سرعة المحاكاة</p>
                        <div className="flex gap-1.5">
                          {[1, 5, 10].map((x) => (
                            <Button
                              key={x}
                              variant={tracker.simulatedSpeedMultiplier === x ? 'default' : 'outline'}
                              size="xs"
                              onClick={() => tracker.setSimulatedSpeedMultiplier(x)}
                              className="font-mono text-xs flex-1 h-7"
                            >
                              {x}x
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[0.625rem] text-muted-foreground font-bold uppercase mb-2">2. تزييف الحالة الحركية</p>
                        <div className="flex gap-1.5">
                          {[
                            { state: 'resting', ar: 'استراحة' },
                            { state: 'walking', ar: 'مشي' },
                            { state: 'running', ar: 'جري' },
                          ].map((m) => (
                            <Button
                              key={m.state}
                              variant={tracker.motionState === m.state ? 'secondary' : 'outline'}
                              size="xs"
                              onClick={() => tracker.simulateMotion(m.state as any)}
                              className="text-[0.6875rem] flex-1 h-7"
                            >
                              {m.ar}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[0.625rem] text-muted-foreground font-bold uppercase mb-2">3. حقن وقت (تخطي تتبع)</p>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => tracker.triggerSimulatedTick(30)}
                            className="font-mono text-xs flex-1 h-7"
                          >
                            +30ث حركة
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => tracker.triggerSimulatedTick(120)}
                            className="font-mono text-xs flex-1 h-7"
                          >
                            +120ث حركة
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </AppCard>
              </Section>
            </motion.div>
          )}

          {activeTab === 'timetable' && (
            <motion.div
              key="timetable"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Daily Workout Timetable Schedule */}
              <div>
                <span className="text-[0.6875rem] text-muted-foreground font-bold uppercase tracking-wide block mb-3">جدول التمارين الأسبوعي</span>

                {/* Horizontal Days Selector */}
                <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 mb-4">
                  {(Object.keys(store.timetable) as DayOfWeekKey[]).map((dayKey) => {
                    const dayData = store.timetable[dayKey];

                    return (
                      <button
                        key={dayKey}
                        onClick={() => setSelectedDay(dayKey)}
                        className={`flex-1 min-w-[50px] py-3 rounded-xl flex flex-col items-center border transition-all active-tactile ${
                          selectedDay === dayKey
                            ? 'bg-[hsl(100,40%,45%)] text-white border-primary/20'
                            : 'bg-card text-muted-foreground border-border/40 hover:text-foreground'
                        }`}
                      >
                        <span className="text-[0.625rem] font-medium leading-none mb-1">{DAYS_MAP[dayKey].short}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-80" style={{ display: dayData.isRestDay ? 'none' : 'block' }} />
                        {dayData.isRestDay && <span className="text-mini text-muted-foreground/50 leading-none">راحة</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Workout Details Card */}
                {selectedDay && (
                  <AppCard className="p-5 space-y-4">
                    {/* Meta Day Setup Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-foreground">جدول يوم {DAYS_MAP[selectedDay].ar}</h2>
                          {store.timetable[selectedDay].isRestDay && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[0.625rem] font-bold">راحة</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={store.timetable[selectedDay].name}
                          onChange={(e) => store.updateWorkoutDayMeta(selectedDay, e.target.value, store.timetable[selectedDay].isRestDay)}
                          className="mt-1 text-xs text-muted-foreground font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none pb-0.5 w-full max-w-xs"
                          placeholder="مثال: تمارين الجزء العلوي"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground select-none">
                          <input
                            type="checkbox"
                            checked={store.timetable[selectedDay].isRestDay}
                            onChange={(e) => store.updateWorkoutDayMeta(selectedDay, store.timetable[selectedDay].name, e.target.checked)}
                            className="rounded border-border/60 text-primary focus:ring-primary w-4 h-4"
                          />
                          يوم استراحة (Rest Day)
                        </label>
                      </div>
                    </div>

                    {/* Day Exercises List */}
                    {!store.timetable[selectedDay].isRestDay ? (
                      <div className="space-y-6">
                        {store.timetable[selectedDay].exercises.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground space-y-3">
                            <Dumbbell className="w-8 h-8 mx-auto text-muted-foreground/30 animate-pulse" />
                            <p className="text-xs">لا توجد تمارين مضافة لليوم بعد.</p>
                            <Button
                              size="sm"
                              onClick={() => setAddExerciseOpen(true)}
                              className="text-xs rounded-lg bg-[hsl(100,40%,42%)] hover:bg-[hsl(100,40%,38%)]"
                            >
                              إضافة تمرين من المكتبة
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {store.timetable[selectedDay].exercises.map((exercise) => (
                              <div key={exercise.id} className="p-4 rounded-xl border border-border/40 bg-muted/5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-foreground">{exercise.name}</span>
                                  <button
                                    onClick={() => store.removeExerciseFromDay(selectedDay, exercise.id)}
                                    className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Exercise Sets Grid */}
                                <div className="space-y-1.5">
                                  <div className="grid grid-cols-4 gap-2 text-[0.625rem] font-bold text-muted-foreground/80 px-1 text-center">
                                    <span>الجلسة</span>
                                    <span>الوزن (كغ)</span>
                                    <span>التكرارات</span>
                                    <span>تمت</span>
                                  </div>

                                  {exercise.sets.map((set, setIdx) => (
                                    <div key={set.id} className="grid grid-cols-4 gap-2 items-center text-center">
                                      <span className="text-xs font-mono font-bold text-muted-foreground/70">{setIdx + 1}</span>

                                      <input
                                        type="number"
                                        value={set.weightKg || ''}
                                        onChange={(e) => store.updateSetValues(selectedDay, exercise.id, setIdx, Number(e.target.value), set.reps)}
                                        className="h-8 rounded bg-card border border-border/40 text-xs font-mono text-center focus:border-primary focus:outline-none w-full"
                                        placeholder="0"
                                      />

                                      <input
                                        type="number"
                                        value={set.reps || ''}
                                        onChange={(e) => store.updateSetValues(selectedDay, exercise.id, setIdx, set.weightKg, Number(e.target.value))}
                                        className="h-8 rounded bg-card border border-border/40 text-xs font-mono text-center focus:border-primary focus:outline-none w-full"
                                        placeholder="0"
                                      />

                                      <div className="flex justify-center">
                                        <button
                                          onClick={() => {
                                            store.toggleSetCompletion(selectedDay, exercise.id, setIdx);
                                            // Trigger rest timer only if checking off completed
                                            if (!set.completed) startRestTimer(60);
                                          }}
                                          className={`w-6 h-6 rounded flex items-center justify-center border transition-all active-tactile ${
                                            set.completed
                                              ? 'bg-emerald-500 border-emerald-500 text-white'
                                              : 'bg-card border-border/60 text-transparent hover:border-primary'
                                          }`}
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Set Controller Triggers */}
                                <div className="flex gap-2 justify-end pt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => store.removeSetFromExercise(selectedDay, exercise.id, exercise.sets.length - 1)}
                                    disabled={exercise.sets.length <= 1}
                                    className="h-7 text-[0.625rem] font-semibold px-2.5"
                                  >
                                    حذف جلسة
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => store.addSetToExercise(selectedDay, exercise.id)}
                                    className="h-7 text-[0.625rem] font-semibold px-2.5 hover:text-primary"
                                  >
                                    إضافة جلسة
                                  </Button>
                                </div>
                              </div>
                            ))}

                            <Button
                              variant="outline"
                              className="w-full h-10 border-dashed rounded-xl text-xs font-bold text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5"
                              onClick={() => setAddExerciseOpen(true)}
                            >
                              <Plus className="w-4 h-4" /> إضافة تمرين جديد لليوم
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <Sparkles className="w-8 h-8 text-amber-500/60 mx-auto mb-3 animate-spin" style={{ animationDuration: '3s' }} />
                        <h4 className="text-sm font-bold text-foreground">يوم استراحة واستشفاء</h4>
                        <p className="text-[0.6875rem] max-w-xs mx-auto mt-1 leading-relaxed">
                          الراحة جزء لا يتجزأ من بناء اللياقة. استغل هذا اليوم للنوم الكافي، وشرب المياه، والاستشفاء العضلي الفعال.
                        </p>
                      </div>
                    )}
                  </AppCard>
                )}
              </div>

              {/* Add Exercise Modal bottom-sheet */}
              <ResponsiveDrawer open={addExerciseOpen} onOpenChange={setAddExerciseOpen} title="إضافة تمرين إلى جدول اليوم">
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Search / Quick insert */}
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="ابحث عن تمرين أو اكتب اسماً مخصصاً..."
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      className="w-full h-9 rounded-xl pe-9 ps-3 bg-muted/50 border border-border/40 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  {exerciseSearch.trim().length > 0 && (
                    <Button
                      className="w-full text-xs font-semibold h-8 rounded-lg bg-primary text-white"
                      onClick={() => {
                        store.addExerciseToDay(selectedDay!, exerciseSearch.trim());
                        setExerciseSearch('');
                        setAddExerciseOpen(false);
                      }}
                    >
                      إضافة «{exerciseSearch.trim()}» كتمرين مخصص
                    </Button>
                  )}

                  <div className="space-y-2">
                    <p className="text-[0.625rem] font-bold text-muted-foreground uppercase">مكتبة التمارين المتاحة</p>
                    {STATIC_EXERCISES.map((ex) => (
                      <button
                        key={ex.key}
                        onClick={() => {
                          store.addExerciseToDay(selectedDay!, ex.name);
                          setAddExerciseOpen(false);
                        }}
                        className="w-full p-3 rounded-lg border border-border/20 text-start bg-card hover:bg-muted/30 transition-colors flex justify-between items-center text-xs font-medium"
                      >
                        <div>
                          <p className="text-foreground">{ex.name}</p>
                          <p className="text-[0.625rem] text-muted-foreground mt-0.5">
                            العضلة: {MUSCLE_GROUPS_AR[ex.muscle]} | المعدات: {ex.equipment}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              </ResponsiveDrawer>
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Muscle Filters chips */}
              <div>
                <span className="text-[0.6875rem] text-muted-foreground font-bold uppercase tracking-wide block mb-3">فلترة حسب المجموعة العضلية</span>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {(Object.keys(MUSCLE_GROUPS_AR) as Array<keyof typeof MUSCLE_GROUPS_AR>).map((group) => (
                    <button
                      key={group}
                      onClick={() => setLibraryFilter(group)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active-tactile ${
                        libraryFilter === group
                          ? 'bg-primary border-primary text-white'
                          : 'bg-card text-muted-foreground border-border/40 hover:text-foreground'
                      }`}
                    >
                      {MUSCLE_GROUPS_AR[group]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search input dictionary */}
              <div className="relative">
                <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث في مكتبة التمارين المتاحة..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full h-10 rounded-xl pe-9 ps-4 bg-card border border-border/40 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              {/* Exercises List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExercises.map((ex) => (
                  <AppCard key={ex.key} className="p-4 flex flex-col justify-between hover:border-primary/30 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-[hsl(100,40%,45%)]/10 text-[hsl(100,40%,45%)] text-[0.625rem] font-bold">
                          {MUSCLE_GROUPS_AR[ex.muscle]}
                        </span>
                        <span className="text-[0.625rem] text-muted-foreground font-bold uppercase">{ex.difficulty}</span>
                      </div>
                      <h3 className="text-xs font-bold text-foreground mb-1.5">{ex.name}</h3>
                      <p className="text-[0.6875rem] text-muted-foreground leading-relaxed mb-3">{ex.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-border/40 text-[0.625rem] text-muted-foreground space-y-1">
                      <div>المعدات اللازمة: <span className="font-semibold text-foreground">{ex.equipment}</span></div>
                      <div>حرق تقديري: <span className="font-semibold text-foreground">{ex.estimatedCaloriesPerMin} سعرة/دقيقة</span></div>
                    </div>
                  </AppCard>
                ))}

                {filteredExercises.length === 0 && (
                  <div className="text-center py-10 col-span-full text-muted-foreground">
                    <Info className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs">لا توجد تمارين تطابق فلتر البحث الحالي.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Metrics Entry Form */}
                <AppCard className="p-5 space-y-4">
                  <h3 className="text-sm font-bold text-foreground pb-2 border-b border-border/40">تسجيل مؤشرات الجسم اليومية</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[0.625rem] font-bold text-muted-foreground uppercase">الوزن (كغ)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="75.0"
                        value={logWeightKg}
                        onChange={(e) => setLogWeightKg(e.target.value)}
                        className="w-full h-9 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono px-3 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.625rem] font-bold text-muted-foreground uppercase">نسبة الدهون % (اختياري)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="15.0"
                        value={logBodyFat}
                        onChange={(e) => setLogBodyFat(e.target.value)}
                        className="w-full h-9 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono px-3 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-bold text-muted-foreground uppercase">تاريخ القياس</label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full h-9 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono px-3 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <Button
                    onClick={() => {
                      if (!logWeightKg) {
                        alert('يرجى تحديد الوزن أولاً.');
                        return;
                      }
                      store.logWeight(logDate, Number(logWeightKg), logBodyFat ? Number(logBodyFat) : undefined);
                      setLogWeightKg('');
                      setLogBodyFat('');
                      alert('تم تسجيل القياس بنجاح.');
                    }}
                    className="w-full text-xs font-bold h-9 rounded-lg bg-[hsl(100,40%,42%)] hover:bg-[hsl(100,40%,38%)]"
                  >
                    حفظ القياس
                  </Button>
                </AppCard>

                {/* Target Milestones */}
                <AppCard className="p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground pb-2 border-b border-border/40">الهدف العضلي والوزني</h3>
                    <p className="text-[0.6875rem] text-muted-foreground mt-2 leading-relaxed">حدد هدفك الأخير للوزن لمقارنته مع التقدم الحالي.</p>

                    <div className="space-y-3 mt-4">
                      <div className="space-y-1">
                        <label className="text-[0.625rem] font-bold text-muted-foreground uppercase">الوزن المستهدف (كغ)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={store.weightTargetKg}
                            onChange={(e) => store.setWeightTarget(Number(e.target.value))}
                            className="flex-1 h-9 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono px-3 focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-muted/10 rounded-lg border border-border/20 text-[0.6875rem] text-muted-foreground space-y-1.5">
                        <div className="flex justify-between">
                          <span>الوزن الأخير:</span>
                          <span className="font-semibold text-foreground">
                            {store.weightLogs.length > 0 ? `${store.weightLogs[store.weightLogs.length - 1].weightKg} كغ` : 'لا يوجد قياس'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>الهدف النهائي:</span>
                          <span className="font-semibold text-primary">{store.weightTargetKg} كغ</span>
                        </div>
                        {store.weightLogs.length > 0 && (
                          <div className="flex justify-between pt-1 border-t border-border/20">
                            <span>المتبقي للهدف:</span>
                            <span className="font-bold text-foreground font-mono">
                              {Math.max(0, store.weightLogs[store.weightLogs.length - 1].weightKg - store.weightTargetKg).toFixed(1)} كغ
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AppCard>
              </div>

              {/* Body Metric Progress Logs Visual Trend */}
              <Section label="منحنى تقدم الوزن والتطور">
                <AppCard className="p-5 h-[280px] flex flex-col justify-between">
                  {store.weightLogs.length > 0 ? (
                    <div className="h-full flex flex-col justify-between">
                      {/* Premium Clean Custom SVG Area Graph instead of raw heavy charts */}
                      <div className="flex-1 flex items-end justify-between h-32 relative mb-2 px-4 pt-4 border-b border-s border-border/60">
                        {/* Target line guide */}
                        <div
                          className="absolute left-0 right-0 border-t border-dashed border-primary/40 z-base"
                          style={{
                            bottom: `${Math.min(90, Math.max(10, ((store.weightTargetKg - 60) / (90 - 60)) * 100))}%`
                          }}
                        >
                          <span className="absolute right-2 -top-4 text-mini text-primary/80 bg-card px-1 font-bold">الهدف: {store.weightTargetKg} كغ</span>
                        </div>

                        {/* Chart plot vectors scaled */}
                        {(() => {
                          const weights = store.weightLogs.map(l => l.weightKg);
                          const minW = Math.min(...weights, store.weightTargetKg) - 2;
                          const maxW = Math.max(...weights, store.weightTargetKg) + 2;
                          const span = maxW - minW || 1;

                          return store.weightLogs.map((log, idx) => {
                            const pctY = ((log.weightKg - minW) / span) * 100;
                            const leftPct = (idx / (store.weightLogs.length - 1 || 1)) * 100;

                            return (
                              <div
                                key={log.id}
                                className="absolute flex flex-col items-center group cursor-pointer"
                                style={{
                                  left: `${leftPct}%`,
                                  bottom: `${pctY}%`,
                                  transform: 'translateX(-50%)',
                                }}
                              >
                                {/* Tooltip hover details */}
                                <div className="absolute bottom-6 bg-foreground text-background text-mini font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                  {log.weightKg} كغ ({log.date})
                                </div>
                                <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-card shadow-sm group-hover:scale-125 transition-transform" />
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex justify-between text-[0.625rem] text-muted-foreground px-2">
                        {store.weightLogs.map((log) => (
                          <span key={log.id} className="font-mono">{log.date.slice(5)}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
                      <BarChart3 className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                      <p className="text-xs">لا توجد قياسات مسجلة كافية لعرض رسم بياني.</p>
                    </div>
                  )}
                </AppCard>
              </Section>

              {/* History Table Log list */}
              <Section label="جدول القياسات السابقة">
                <AppCard className="p-4 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/40 text-muted-foreground text-[0.6875rem] font-bold">
                          <th className="py-2 text-start">التاريخ</th>
                          <th className="py-2 text-center">الوزن (كغ)</th>
                          <th className="py-2 text-center">نسبة الدهون %</th>
                          <th className="py-2 text-end">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {store.weightLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                            <td className="py-2.5 font-mono text-muted-foreground">{log.date}</td>
                            <td className="py-2.5 text-center font-bold text-foreground">{log.weightKg}</td>
                            <td className="py-2.5 text-center font-mono text-muted-foreground">{log.bodyFatPct ? `${log.bodyFatPct}%` : '—'}</td>
                            <td className="py-2.5 text-end">
                              <button
                                onClick={() => store.deleteWeightLog(log.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}

                        {store.weightLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">لا توجد سجلات قياسات مخزنة بعد.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AppCard>
              </Section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* GPS Tracked Activity History */}
              <Section label="سجل الأنشطة والمسارات المسجلة">
                <div className="space-y-4">
                  {tracker.activities.length === 0 ? (
                    <AppCard className="p-8 text-center text-muted-foreground space-y-2">
                      <History className="w-8 h-8 mx-auto text-muted-foreground/30 animate-pulse" />
                      <p className="text-xs font-semibold">لا توجد مسارات GPS مسجلة بعد.</p>
                      <p className="text-[0.625rem]">ابدأ تتبع نشاط جديد من تبويب الرئيسية لترى مساراتك وإحصائياتك التفصيلية هنا.</p>
                    </AppCard>
                  ) : (
                    tracker.activities.map((act) => {
                      const hasRoute = act.route && act.route.length > 1;
                      const dateFormatted = new Date(act.start_time).toLocaleString('ar', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <AppCard key={act.id} className="p-4 space-y-4 hover:border-primary/20 transition-all">
                          {/* Card Header metadata */}
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {act.activity_type === 'running' ? 'تمرين جري سريع 🏃‍♂️' : 'تمرين مشي هوائي 🚶‍♂️'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-mini font-bold uppercase">
                                  {act.source === 'auto' ? 'تلقائي' : 'يدوي'}
                                </span>
                              </div>
                              <p className="text-[0.625rem] text-muted-foreground mt-0.5">{dateFormatted}</p>
                            </div>

                            <div className="text-end">
                              <p className="text-xs font-bold text-foreground">
                                {((act.distance_meters || 0) / 1000).toFixed(2)} كم
                              </p>
                              <p className="text-[0.625rem] text-muted-foreground">
                                {Math.floor((act.duration_seconds || 0) / 60)}د {Math.floor((act.duration_seconds || 0) % 60)}ث
                              </p>
                            </div>
                          </div>

                          {/* SVG Route Thumbnail vector drawing */}
                          {hasRoute && (
                            <div className="h-20 bg-muted/5 rounded-lg overflow-hidden border border-border/20 flex items-center justify-center p-2 relative">
                              <RouteThumbnail route={act.route} height={70} />
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => setSelectedMapActivity(act)}
                                className="absolute bottom-2 left-2 text-[0.625rem] h-6 px-2 shadow-sm"
                              >
                                عرض الخريطة التفاعلية
                              </Button>
                            </div>
                          )}

                          {/* Detailed Kilometric splits metrics */}
                          <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-3 text-[0.6875rem] text-muted-foreground leading-relaxed">
                            <div>السعرات المحروقة: <span className="font-semibold text-foreground">{act.calories ? Math.floor(act.calories) : '—'} Kcal</span></div>
                            <div>السرعة المتوسطة: <span className="font-semibold text-foreground">
                              {act.duration_seconds && act.distance_meters
                                ? ((act.distance_meters / act.duration_seconds) * 3.6).toFixed(1)
                                : '—'}{' '}
                              كم/س
                            </span></div>
                          </div>
                        </AppCard>
                      );
                    })
                  )}
                </div>
              </Section>

              {/* Interactive map overlay drawer */}
              <ResponsiveDrawer
                open={selectedMapActivity !== null}
                onOpenChange={(open) => !open && setSelectedMapActivity(null)}
                title="الخريطة التفاعلية للنشاط"
                description="استعراض دقيق لمسار الحركة عبر نظام تحديد المواقع الجغرافي والأقمار الصناعية"
              >
                {selectedMapActivity && (
                  <div className="p-4 space-y-4">
                    <FullActivityMap activity={selectedMapActivity} height={340} />

                    {/* Telemetry info card */}
                    <div className="p-3.5 rounded-xl border border-border/40 bg-muted/5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">التفاصيل العامة للنشاط</p>
                        <p className="text-[0.625rem] text-muted-foreground mt-0.5">خطوات المسار: {selectedMapActivity.route?.length || 0} إحداثية مصفاة</p>
                      </div>
                      <div className="text-end">
                        <p className="text-xs font-bold text-primary">المسافة: {((selectedMapActivity.distance_meters || 0) / 1000).toFixed(2)} كم</p>
                        <p className="text-[0.625rem] text-muted-foreground">الوقت: {Math.floor((selectedMapActivity.duration_seconds || 0) / 60)} دقيقة</p>
                      </div>
                    </div>
                  </div>
                )}
              </ResponsiveDrawer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageShell>
  );
}

// ============================================================================
// Internal Page State Holders (kept outside page component to allow clean hot-reload)
// ============================================================================

let currentDayKey: DayOfWeekKey = 'sat';
const currentDay = new Date().getDay();
if (currentDay === 6) currentDayKey = 'sat';
else if (currentDay === 0) currentDayKey = 'sun';
else if (currentDay === 1) currentDayKey = 'mon';
else if (currentDay === 2) currentDayKey = 'tue';
else if (currentDay === 3) currentDayKey = 'wed';
else if (currentDay === 4) currentDayKey = 'thu';
else if (currentDay === 5) currentDayKey = 'fri';

export default function FitnessPage() {
  const [selectedDay, setSelectedDay] = useState<DayOfWeekKey>(currentDayKey);
  const [addExerciseOpen, setAddExerciseOpen] = useState<boolean>(false);
  const [exerciseSearch, setExerciseSearch] = useState<string>('');

  // Library filters
  const [libraryFilter, setLibraryFilter] = useState<string>('all');
  const [librarySearch, setLibrarySearch] = useState<string>('');

  // Body progress logging
  const [logWeightKg, setLogWeightKg] = useState<string>('');
  const [logBodyFat, setLogBodyFat] = useState<string>('');
  const [logDate, setLogDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Selected map activity
  const [selectedMapActivity, setSelectedMapActivity] = useState<any>(null);

  // Filtered exercises derived memo
  const filteredExercises = useMemo(() => {
    return STATIC_EXERCISES.filter((ex) => {
      const matchGroup = libraryFilter === 'all' || ex.muscle === libraryFilter;
      const q = librarySearch.toLowerCase().trim();
      const matchSearch = !q || ex.name.toLowerCase().includes(q) || ex.desc.toLowerCase().includes(q) || ex.equipment.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [libraryFilter, librarySearch]);

  return (
    <FitnessPageInner
      selectedDay={selectedDay}
      setSelectedDay={setSelectedDay}
      addExerciseOpen={addExerciseOpen}
      setAddExerciseOpen={setAddExerciseOpen}
      exerciseSearch={exerciseSearch}
      setExerciseSearch={setExerciseSearch}
      libraryFilter={libraryFilter}
      setLibraryFilter={setLibraryFilter}
      librarySearch={librarySearch}
      setLibrarySearch={setLibrarySearch}
      logWeightKg={logWeightKg}
      setLogWeightKg={setLogWeightKg}
      logBodyFat={logBodyFat}
      setLogBodyFat={setLogBodyFat}
      logDate={logDate}
      setLogDate={setLogDate}
      selectedMapActivity={selectedMapActivity}
      setSelectedMapActivity={setSelectedMapActivity}
      filteredExercises={filteredExercises}
    />
  );
}
