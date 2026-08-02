import React, { useMemo,useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { PageShell } from '@/components/ui/app-shell';
import { ArrowLeft } from '@/lib/icons';
import { Award, BookOpen, CheckCircle, Crown,HelpCircle, RotateCcw, Zap } from '@/lib/icons';

import { ExerciseSession } from '../components/ExerciseSession';
import {
  STARTER_LESSONS,
  STARTER_LEVELS,
  STARTER_UNITS,
  STARTER_VOCABULARY,
} from '../data/starterCourse';
import {
  useMarkLessonCompleted,
  useSrsState,
  useUserProgress,
  useUserStats,
} from '../hooks';
import { CefrLevelCode } from '../types';

export const GermanHome: React.FC = () => {
  const navigate = useNavigate();

  const { data: progress = [], isLoading: loadingProg } = useUserProgress();
  const { data: stats = null, isLoading: loadingStats } = useUserStats();
  const { data: srsData = [], isLoading: loadingSrs } = useSrsState();
  const markLessonComplete = useMarkLessonCompleted();

  const [activeLevel, setActiveLevel] = useState<CefrLevelCode>('A0');
  const [activeSessionMinutes, setActiveSessionMinutes] = useState<number | null>(null);

  const completedLessonIds = useMemo(() => {
    return new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  }, [progress]);

  const levels = STARTER_LEVELS;
  const units = STARTER_UNITS;
  const lessons = STARTER_LESSONS;
  const vocab = STARTER_VOCABULARY;

  const currentLevelObj = levels.find((l) => l.code === activeLevel) || levels[0];
  const unitsInActiveLevel = units.filter((u) => u.level_id === currentLevelObj.id);
  const activeLevelLessons = lessons.filter((l) =>
    unitsInActiveLevel.some((u) => u.id === l.unit_id)
  );

  const completedCount = activeLevelLessons.filter((l) => completedLessonIds.has(l.id)).length;
  const progressPercent =
    activeLevelLessons.length === 0 ? 0 : Math.round((completedCount / activeLevelLessons.length) * 100);

  const handleLessonCompleteDirectly = async (lessonId: string) => {
    try {
      await markLessonComplete(lessonId, 100);
      toast.success('تم إنجاز الدرس بنجاح واكتساب النقاط!', {
        icon: <Award className="h-4 w-4 text-emerald-500" />,
      });
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ تقدمك');
    }
  };

  const pendingSrsReviews = srsData.filter(
    (item) => new Date(item.due_at) <= new Date()
  ).length;

  if (activeSessionMinutes !== null) {
    return (
      <PageShell flush centered={false}>
        <ExerciseSession
          minutes={activeSessionMinutes}
          onClose={() => setActiveSessionMinutes(null)}
        />
      </PageShell>
    );
  }

  return (
    <PageShell flush centered={false}>
      <Helmet>
        <title>تعلم الألمانية | Zen Elite</title>
        <meta name="theme-color" content="#080808" />
      </Helmet>

      {/* Ambient background glow to match Zen Elite system */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-500/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col pb-page">
        {/* Luxury Header */}
        <div className="app-header-chrome">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <Link to="/"><ArrowLeft className="h-6 w-6 text-muted-foreground" /></Link>
            <div className="flex flex-col items-end text-end">
              <h1 className="font-amiri text-lg font-bold tracking-wide text-foreground">
                المسار الألماني
              </h1>
              <p className="font-tajawal text-micro text-muted-foreground font-medium uppercase tracking-widest">
                Deutsch Lernen
              </p>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-lg flex-1 p-4 space-y-8 mt-2">

          {/* User Metrics / Profile Block */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Crown className="w-32 h-32" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">

              <div className="flex-1 space-y-4">
                <div className="space-y-1 text-end">
                  <h2 className="font-tajawal text-xl font-bold text-foreground">
                    مستواك الحالي: {currentLevelObj.name_ar}
                  </h2>
                  <p className="font-tajawal text-xs text-muted-foreground">
                    مستوى الإتقان والتطور المستمر
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono font-medium text-muted-foreground">
                    <span>{progressPercent}%</span>
                    <span>التقدم العام</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--live))] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 justify-end md:justify-center">
                <div className="text-center">
                  <span className="block text-micro text-muted-foreground uppercase tracking-widest font-tajawal mb-1">نقاط الخبرة</span>
                  <span className="font-plex-mono text-xl font-bold text-foreground">{stats?.xp || 0}</span>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                  <span className="block text-micro text-muted-foreground uppercase tracking-widest font-tajawal mb-1">أيام المواظبة</span>
                  <div className="flex items-center gap-1 justify-center">
                    <Zap className="h-3.5 w-3.5 text-[hsl(var(--live))]" />
                    <span className="font-plex-mono text-xl font-bold text-[hsl(var(--live))]">{stats?.streak_days || 0}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Level Switcher (Tabs) */}
          <div className="relative w-full rounded-xl bg-secondary/30 p-1 flex items-center gap-1 border border-border/40 backdrop-blur-sm">
            {(['A0', 'A1', 'A2', 'B1', 'B2'] as const).map((level) => {
              const isActive = activeLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setActiveLevel(level)}
                  className={`relative flex-1 py-2.5 text-center rounded-lg font-tajawal text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-card text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-x-0 -bottom-px h-px bg-[hsl(var(--live))]/50 mx-auto w-1/2" />
                  )}
                  {level}
                </button>
              );
            })}
          </div>

          {/* Spaced Repetition (SRS) Dashboard */}
          <div className="group relative overflow-hidden rounded-2xl border border-[hsl(var(--live))]/20 bg-[hsl(var(--live))]/[0.02] p-6 shadow-sm transition-colors hover:bg-[hsl(var(--live))]/[0.04]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(var(--live))]/10 blur-3xl transition-opacity group-hover:opacity-100 opacity-50" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] shadow-inner">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div className="space-y-1 text-end">
                  <h4 className="font-tajawal text-sm font-bold text-foreground">
                    المراجعة الذكية (FSRS)
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-tajawal">
                    خوارزمية التكرار المتباعد تضمن ترسيخ الكلمات والقواعد في الذاكرة طويلة الأمد.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[140px]">
                <div className="flex items-center justify-between bg-background/50 px-3 py-2 rounded-lg border border-border/50">
                  <span className="font-tajawal text-micro text-muted-foreground">مستحقة للمراجعة</span>
                  <span className="font-plex-mono text-sm font-bold text-foreground">{pendingSrsReviews || vocab.length}</span>
                </div>
                <button
                  onClick={() => setActiveSessionMinutes(5)}
                  className="w-full py-2.5 bg-[hsl(var(--live))] text-white hover:bg-[hsl(var(--live))]/90 rounded-lg text-xs font-bold font-tajawal shadow-sm transition-transform active:scale-95"
                >
                  ابدأ الجلسة (5 دقائق)
                </button>
              </div>
            </div>
          </div>

          {/* CEFR Level Map: Units and Lessons list */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 justify-end px-2">
              <span className="h-px flex-1 bg-border/40" />
              <h3 className="font-amiri text-lg font-bold text-foreground">
                خريطة الدروس
              </h3>
            </div>

            {unitsInActiveLevel.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/50 bg-secondary/10 space-y-4" dir="rtl">
                <div className="p-4 bg-secondary/30 text-muted-foreground rounded-full">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <h4 className="font-tajawal text-sm font-bold text-foreground">المحتوى قيد التطوير</h4>
                <p className="font-tajawal text-xs text-muted-foreground max-w-[250px]">
                  هذا المستوى سيتم إضافته قريباً. يرجى التركيز على المستويات السابقة.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {unitsInActiveLevel.map((unit, uIdx) => {
                  const lessonsInUnit = lessons.filter((l) => l.unit_id === unit.id);

                  return (
                    <div
                      key={unit.id}
                      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-1 shadow-sm transition-all hover:border-border/80"
                    >
                      {/* Unit Header */}
                      <div className="flex items-center justify-between p-4 border-b border-border/40">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-foreground/80 group-hover:bg-[hsl(var(--live))]/10 group-hover:text-[hsl(var(--live))] transition-colors">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="text-end">
                            <h4 className="font-tajawal text-sm font-bold text-foreground">
                              {unit.title_ar}
                            </h4>
                            <p className="font-plex-mono text-micro text-muted-foreground tracking-widest mt-0.5">
                              {unit.title_de}
                            </p>
                          </div>
                        </div>

                        {unit.theme && (
                          <span className="px-2.5 py-1 rounded-md bg-secondary/50 text-mini font-plex-mono text-muted-foreground font-semibold uppercase border border-border/40">
                            UNIT {uIdx + 1}
                          </span>
                        )}
                      </div>

                      {/* Lessons Grid */}
                      <div className="grid grid-cols-1 gap-2 p-2">
                        {lessonsInUnit.map((lesson, lIdx) => {
                          const isCompleted = completedLessonIds.has(lesson.id);

                          return (
                            <div
                              key={lesson.id}
                              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between group/lesson ${
                                isCompleted
                                  ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                                  : 'bg-background hover:bg-secondary/20 border-transparent hover:border-border/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                    <CheckCircle className="h-4.5 w-4.5" />
                                  </div>
                                ) : (
                                  <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center shrink-0">
                                    <span className="font-plex-mono text-micro text-muted-foreground">{lIdx + 1}</span>
                                  </div>
                                )}

                                <div className="space-y-0.5 text-end">
                                  <h5 className={`font-tajawal text-sm font-bold ${isCompleted ? 'text-foreground' : 'text-foreground/90'}`}>
                                    {lesson.title_ar}
                                  </h5>
                                  <div className="flex items-center gap-2" dir="ltr">
                                    <span className="font-plex-mono text-micro text-muted-foreground">
                                      {lesson.title_de}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span className="font-tajawal text-mini text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-secondary/50">
                                      {lesson.type}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {!isCompleted && (
                                <button
                                  onClick={() => handleLessonCompleteDirectly(lesson.id)}
                                  className="px-3 py-1.5 rounded-lg bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] hover:bg-[hsl(var(--live))]/20 text-xs font-bold font-tajawal transition-all opacity-0 group-hover/lesson:opacity-100"
                                >
                                  إنجاز
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </PageShell>
  );
};
export default GermanHome;
