import React, { useState, useMemo } from 'react';
import { PageShell } from '@/components/ui/app-shell';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import {
  useCefrLevels,
  useUnits,
  useLessons,
  useGermanStats,
  useGermanProgress,
  useVocabularyItems,
  useUpdateLessonProgress,
} from '../hooks';
import { STARTER_LEVELS, STARTER_UNITS, STARTER_LESSONS } from '../data/starterCourse';
import { ExerciseSession } from '../components/ExerciseSession';
import { GermanGenderBadge } from '../components/GermanGenderBadge';
import {
  Sparkles,
  BookOpen,
  Award,
  Zap,
  Play,
  RotateCcw,
  CheckCircle,
  HelpCircle,
} from '@/lib/icons';

export const GermanHome: React.FC = () => {
  const { data: levels = STARTER_LEVELS } = useCefrLevels();
  const { data: units = STARTER_UNITS } = useUnits();
  const { data: lessons = STARTER_LESSONS } = useLessons();
  const { data: stats } = useGermanStats();
  const { data: progress = [] } = useGermanProgress();
  const { data: vocab = [] } = useVocabularyItems();
  const updateProgress = useUpdateLessonProgress();

  const [activeLevel, setActiveLevel] = useState<'A0' | 'A1' | 'A2'>('A0');
  const [activeSessionMinutes, setActiveSessionMinutes] = useState<number | null>(null);

  const completedLessonIds = useMemo(() => {
    return new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  }, [progress]);

  // Statistics summaries
  const totalXp = stats?.xp ?? 0;
  const currentStreak = stats?.streak_days ?? 0;
  const currentLevel = levels.find((l) => l.code === activeLevel);
  const unitsInActiveLevel = units.filter((u) => u.level_id === currentLevel?.id);

  // Quick calculate overall progress percent for A0 + A1
  const activeLevelLessons = useMemo(() => {
    const activeLevelUnitIds = new Set(unitsInActiveLevel.map((u) => u.id));
    return lessons.filter((l) => activeLevelUnitIds.has(l.unit_id));
  }, [lessons, unitsInActiveLevel]);

  const completedCount = activeLevelLessons.filter((l) => completedLessonIds.has(l.id)).length;
  const progressPercent = activeLevelLessons.length > 0 ? Math.round((completedCount / activeLevelLessons.length) * 100) : 0;

  // Find next lesson to practice
  const nextLesson = useMemo(() => {
    return activeLevelLessons.find((l) => !completedLessonIds.has(l.id)) || activeLevelLessons[0];
  }, [activeLevelLessons, completedLessonIds]);

  const handleLessonCompleteDirectly = (lessonId: string) => {
    updateProgress.mutate({
      lessonId,
      status: 'completed',
      score: 100,
    });
  };

  return (
    <PageShell centered={false} flush>
      <SEO
        title="ديوان اللغة الألمانية — تعلم النخبة"
        description="تعلم الألمانية بأسلوب منهجي برابط لغوي مبتكر مع لغتك العربية وجسر النحو والمفردات الذكي."
        path="/de-learning"
      />

      <div className="relative min-h-screen bg-[#080808] text-stone-200 antialiased font-tajawal pb-20">
        {/* Ambient top glowing overlay conforming to Zen Elite system (6% opacity, Play/teal hue) */}
        <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-teal-500/10 via-transparent to-transparent pointer-events-none z-0" />

        {/* Header Section */}
        <header className="relative max-w-4xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between border-b border-stone-900/60 z-10">
          <div className="flex items-center gap-4">
            <BackButton to="/" className="text-stone-400 hover:text-white" />
            <div>
              <h1 className="font-amiri text-title font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>ديوان الألمانية</span>
                <span className="text-xs font-mono font-normal text-teal-500 border border-teal-500/20 px-2 py-0.5 rounded bg-teal-500/5">
                  DE-LEARNING
                </span>
              </h1>
              <p className="text-micro text-stone-400 leading-normal mt-0.5">منهج النخبة الميسر لمتحدثي العربية</p>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/60 border border-stone-800 text-stone-300">
              <Zap className="h-4 w-4 text-teal-500" />
              <span className="font-mono text-xs font-bold">{totalXp} XP</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/60 border border-stone-800 text-stone-300">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="font-mono text-xs font-bold">{currentStreak} يوم</span>
            </div>
          </div>
        </header>

        {/* Active Session Overlay Modal */}
        {activeSessionMinutes !== null && (
          <div className="fixed inset-0 bg-[#080808]/98 backdrop-blur-md z-50 overflow-y-auto pt-6 flex items-center justify-center">
            <div className="w-full max-w-lg">
              <ExerciseSession
                minutes={activeSessionMinutes}
                onClose={() => {
                  setActiveSessionMinutes(null);
                }}
              />
            </div>
          </div>
        )}

        <main className="relative max-w-4xl mx-auto px-4 pt-8 space-y-8 z-10">
          {/* Main Dashboard Widget */}
          <div className="relative overflow-hidden rounded-2xl border border-stone-900 bg-stone-950 p-6 space-y-6">
            {/* Corner Ornaments */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-teal-500/20 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-teal-500/20 pointer-events-none" />

            <div className="flex flex-col min-[700px]:flex-row min-[700px]:items-center min-[700px]:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-teal-500/10 text-teal-500 border border-teal-500/20">
                    مستواك الحالي: {activeLevel}
                  </span>
                  <span className="text-[10px] text-stone-400">نظام التكرار المتباعد FSRS نشط</span>
                </div>
                <h2 className="font-amiri text-lg font-bold text-white leading-normal">
                  {nextLesson ? `الدرس القادم: ${nextLesson.title_ar}` : 'جاهز للمراجعة الفورية!'}
                </h2>
                <p className="font-tajawal text-xs text-stone-400 leading-relaxed max-w-md">
                  يتكامل هذا المساق علمياً مع قواعد اللغة العربية لتسريع الفهم باستخدام جسور النحو العربي والـ Komposita المقارن.
                </p>
              </div>

              {/* Action Trigger */}
              <button
                onClick={() => setActiveSessionMinutes(5)}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-tajawal text-sm font-bold shadow-md shadow-teal-500/10 transition-transform active:scale-95 whitespace-nowrap self-start min-[700px]:self-center"
              >
                <Play className="h-4.5 w-4.5" />
                <span>ابدأ جلسة تدريب (5 دق)</span>
              </button>
            </div>

            {/* Progress metrics */}
            <div className="pt-4 border-t border-stone-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">التقدم الإجمالي للمستوى {activeLevel}</span>
                  <span className="font-mono font-bold text-white">{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-stone-900 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-6 sm:pl-6">
                <div className="text-center">
                  <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-mono">الدروس المنجزة</span>
                  <span className="font-mono text-base font-extrabold text-white">{completedCount} / {activeLevelLessons.length}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-mono">مفردات المساق</span>
                  <span className="font-mono text-base font-extrabold text-white">{vocab.length > 0 ? vocab.length : 11}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Level Switcher segmented controls */}
          <div className="flex items-center p-1 rounded-xl bg-stone-950 border border-stone-900 max-w-md">
            {(['A0', 'A1', 'A2'] as const).map((level) => {
              const isActive = activeLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setActiveLevel(level)}
                  className={`flex-1 py-2 text-center rounded-lg font-tajawal text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-white hover:bg-stone-900/40'
                  }`}
                >
                  المستوى {level}
                </button>
              );
            })}
          </div>

          {/* CEFR Level Map: Units and Lessons list */}
          <div className="space-y-6">
            <h3 className="app-section-label">خريطة الوحدات والدروس المنهجية</h3>

            {unitsInActiveLevel.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-stone-900 bg-stone-950/40 space-y-4" dir="rtl">
                <div className="p-3 bg-stone-900 text-stone-400 rounded-full inline-flex">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <h4 className="font-tajawal text-sm font-bold text-white">محتوى مغلق أو غير متوفر حالياً</h4>
                <p className="font-tajawal text-xs text-muted-foreground max-w-sm mx-auto">
                  هذا المستوى الدراسي مغلق حالياً. يرجى إتمام الوحدات الأولى وتطوير مستواك لفتحه تلقائياً.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {unitsInActiveLevel.map((unit, uIdx) => {
                  const lessonsInUnit = lessons.filter((l) => l.unit_id === unit.id);

                  return (
                    <div
                      key={unit.id}
                      className="relative overflow-hidden rounded-xl border border-stone-900 bg-stone-950 p-5 space-y-4"
                    >
                      {/* Unit Header */}
                      <div className="flex items-center justify-between border-b border-stone-900/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
                            <BookOpen className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <h4 className="font-amiri text-base font-extrabold text-white">
                              الوحدة {uIdx + 1}: {unit.title_ar}
                            </h4>
                            <p className="font-mono text-[10px] text-stone-400 uppercase tracking-widest leading-none mt-0.5">
                              {unit.title_de}
                            </p>
                          </div>
                        </div>

                        {unit.theme && (
                          <span className="px-2.5 py-1 rounded bg-stone-900 text-[10px] font-mono text-stone-300 font-bold uppercase border border-stone-800">
                            {unit.theme}
                          </span>
                        )}
                      </div>

                      {/* Lessons Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {lessonsInUnit.map((lesson, lIdx) => {
                          const isCompleted = completedLessonIds.has(lesson.id);

                          return (
                            <div
                              key={lesson.id}
                              className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                                isCompleted
                                  ? 'bg-emerald-950/10 border-emerald-950 text-emerald-400'
                                  : 'bg-stone-950 border-stone-900 text-stone-300 hover:border-stone-800'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono opacity-60">الدرس {lIdx + 1}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-stone-900 border border-stone-800 text-stone-400 uppercase">
                                    {lesson.type}
                                  </span>
                                </div>
                                <h5 className="font-tajawal text-sm font-bold text-white opacity-95">
                                  {lesson.title_ar}
                                </h5>
                                <p className="font-mono text-[11px] text-stone-400" dir="ltr">
                                  {lesson.title_de}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {isCompleted ? (
                                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <button
                                    onClick={() => handleLessonCompleteDirectly(lesson.id)}
                                    className="p-2 rounded bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 text-xs font-bold font-tajawal transition-all"
                                  >
                                    إنجاز فوري
                                  </button>
                                )}
                              </div>
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

          {/* Spaced Repetition (SRS) Review Dashboard */}
          <div className="rounded-xl border border-stone-900 bg-stone-950 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-tajawal text-sm font-bold text-white">صندوق المراجعة والتكرار المتباعد FSRS</h4>
                <p className="text-[10px] text-stone-400 mt-0.5">يقوم خوارزم الفاصل الزمني FSRS بحساب نضج ذاكرتك لكل كلمة.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quick review action card */}
              <div className="p-4 rounded-lg bg-secondary/20 border border-border/40 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-stone-400 font-mono tracking-wide">الكلمات المستحقة للمراجعة الآن</span>
                  <h5 className="font-mono text-xl font-black text-white">
                    {vocab.filter((v) => v.id.startsWith('v-')).length} كلمات جاهزة
                  </h5>
                </div>
                <button
                  onClick={() => setActiveSessionMinutes(5)}
                  className="w-full py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-bold font-tajawal shadow-sm"
                >
                  ابدأ جلسة مراجعة ذكية (5 دقائق)
                </button>
              </div>

              {/* FSRS explanation list */}
              <div className="text-right space-y-2.5 pr-2">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <p className="text-xs text-stone-400 leading-normal">
                    <strong className="text-white">جدول زمني ذكي:</strong> تظهر الكلمات للمراجعة عندما تنخفض درجة الاسترجاع التقريبية لـ 90%.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <p className="text-xs text-stone-400 leading-normal">
                    <strong className="text-white">رابط الجسر اللغوي:</strong> تربط الألمانية بضمائر الرفع والنصب والجر العربية لتفعيل الذاكرة المنطقية المقارنة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageShell>
  );
};
export default GermanHome;
