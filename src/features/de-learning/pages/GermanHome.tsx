import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { PageShell } from '@/components/ui/app-shell';
import { ArrowLeft, Award, BookOpen, CheckCircle, Crown, HelpCircle, RotateCcw, Zap, Compass, Search, Sparkles } from '@/lib/icons';

import { ExerciseSession } from '../components/ExerciseSession';
import { SituationalShelves } from '../components/SituationalShelves';
import { VipSubscriptionBanner } from '../components/VipSubscriptionBanner';

import {
  STARTER_LESSONS,
  STARTER_LEVELS,
  STARTER_UNITS,
  STARTER_VOCABULARY,
  EXTENDED_VOCABULARY_LIST,
  EXTENDED_SENTENCES_LIST,
  EXTENDED_PHRASES_LIST,
  EXTENDED_EXPRESSIONS_LIST,
  STARTER_GRAMMAR_POINTS,
  SYSTEMATIC_DIALOGUE_SCENARIOS,
  SYSTEMATIC_VERB_CONJUGATIONS,
  SYSTEMATIC_SUFFIX_GENDER_RULES,
  SYSTEMATIC_PHONETIC_BRIDGE_ITEMS,
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

  const levels = STARTER_LEVELS;
  const units = STARTER_UNITS;
  const lessons = STARTER_LESSONS;

  const { data: progress = [] } = useUserProgress();
  const { data: stats = null } = useUserStats();
  const { data: srsData = [] } = useSrsState();
  const markLessonComplete = useMarkLessonCompleted();

  const [activeLevel, setActiveLevel] = useState<CefrLevelCode>('A0');
  const [activeSessionMinutes, setActiveSessionMinutes] = useState<number | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | undefined>(undefined);

  // VIP Subscription state (€1000/mo elite mode enabled by default)
  const [isVipActive, setIsVipActive] = useState<boolean>(true);

  // Advanced learning environment states (Default: 'shelves' for the Gen Z situational experience)
  const [activeTab, setActiveTab] = useState<
    'shelves' | 'lessons' | 'handbook' | 'dictionary' | 'tutor' | 'dialogues' | 'conjugator' | 'gender' | 'phonetics' | 'placement'
  >('shelves');

  // Dictionary Tab States
  const [dictType, setDictType] = useState<'words' | 'sentences' | 'phrases' | 'expressions'>('words');
  const [searchQuery, setSearchQuery] = useState('');
  const [dictLevelFilter, setDictLevelFilter] = useState<string>('all');
  const [dictFlashcardMode, setDictFlashcardMode] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [dictPage, setDictPage] = useState<{ key: string; count: number }>({ key: '', count: 30 });

  // Placement Test States
  const [placementStarted, setPlacementStarted] = useState(false);
  const [placementStep, setPlacementStep] = useState(0);
  const [placementScore, setPlacementScore] = useState(0);
  const [placementResult, setPlacementResult] = useState<string | null>(null);

  // AI Tutor Analyzer states
  const [userSentenceInput, setUserSentenceInput] = useState('');
  const [analyzerResult, setAnalyzerResult] = useState<{
    translation: string;
    words: { word: string; pos: string; analysis: string }[];
    grammarNote: string;
  } | null>(null);

  // Systematic Dialogue States
  const [selectedDialogueId, setSelectedDialogueId] = useState<string | null>(null);
  const [dialogueStep, setDialogueStep] = useState<'intro' | 'chat' | 'branch' | 'outcome'>('intro');
  const [dialogueUserBranchChoice, setDialogueUserBranchChoice] = useState<string | null>(null);
  const [dialogueShowArTranslation, setDialogueShowArTranslation] = useState<boolean>(false);

  // Systematic Verb Conjugator States
  const [selectedVerbId, setSelectedVerbId] = useState<string>('conj-sein');
  const [conjugatorTense, setConjugatorTense] = useState<'present' | 'perfekt'>('present');

  // Suffix-Based Gender States
  const [genderSuffixQuery, setGenderSuffixQuery] = useState('');
  const [genderQuizActive, setGenderQuizActive] = useState(false);
  const [genderQuizIndex, setGenderQuizIndex] = useState(0);
  const [genderQuizScore, setGenderQuizScore] = useState(0);
  const [genderQuizSelected, setGenderQuizSelected] = useState<'der' | 'die' | 'das' | null>(null);
  const [genderQuizFdbk, setGenderQuizFdbk] = useState<{ correct: boolean; msg: string } | null>(null);

  // Phonetic Soundboard States
  const [selectedPhoneticId, setSelectedPhoneticId] = useState<string | null>(null);

  const completedLessonIds = useMemo(() => {
    return new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  }, [progress]);

  const currentLevelObj = useMemo(() => {
    return levels.find((l) => l.code === activeLevel) || levels[0];
  }, [levels, activeLevel]);

  const unitsInActiveLevel = useMemo(() => {
    return units.filter((u) => u.level_id === currentLevelObj?.id);
  }, [units, currentLevelObj]);

  const activeLevelLessons = useMemo(() => {
    return lessons.filter((l) =>
      unitsInActiveLevel.some((u) => u.id === l.unit_id)
    );
  }, [lessons, unitsInActiveLevel]);

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

  const corpusTotals = useMemo(
    () => ({
      words: EXTENDED_VOCABULARY_LIST.length,
      sentences: EXTENDED_SENTENCES_LIST.length,
      phrases: EXTENDED_PHRASES_LIST.length,
      expressions: EXTENDED_EXPRESSIONS_LIST.length,
    }),
    [],
  );

  // Dictionary filter logic
  const matchedDictItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (dictType === 'words') {
      return EXTENDED_VOCABULARY_LIST.filter((item) => {
        const matchesQuery = !query || item.lemma_de.toLowerCase().includes(query) || item.translation_ar.includes(query);
        const matchesLevel = dictLevelFilter === 'all' || item.level_id === dictLevelFilter;
        return matchesQuery && matchesLevel;
      });
    } else if (dictType === 'sentences') {
      return EXTENDED_SENTENCES_LIST.filter((item) => {
        const matchesQuery = !query || item.text_de.toLowerCase().includes(query) || item.text_ar.includes(query);
        const matchesLevel = dictLevelFilter === 'all' || item.level_id === dictLevelFilter;
        return matchesQuery && matchesLevel;
      });
    } else if (dictType === 'phrases') {
      return EXTENDED_PHRASES_LIST.filter((item) => {
        const matchesQuery = !query || item.text_de.toLowerCase().includes(query) || item.text_ar.includes(query);
        const matchesLevel = dictLevelFilter === 'all' || item.level_id === dictLevelFilter;
        return matchesQuery && matchesLevel;
      });
    } else {
      return EXTENDED_EXPRESSIONS_LIST.filter((item) => {
        const matchesQuery = !query || item.text_de.toLowerCase().includes(query) || item.text_ar.includes(query);
        const matchesLevel = dictLevelFilter === 'all' || item.level_id === dictLevelFilter;
        return matchesQuery && matchesLevel;
      });
    }
  }, [dictType, searchQuery, dictLevelFilter]);

  const dictFilterKey = `${dictType}|${searchQuery}|${dictLevelFilter}`;
  const dictVisibleCount = dictPage.key === dictFilterKey ? dictPage.count : 30;

  const filteredDictItems = useMemo(
    () => matchedDictItems.slice(0, dictVisibleCount),
    [matchedDictItems, dictVisibleCount],
  );

  // AI Language Analyzer simulator
  const handleAnalyzeSentence = () => {
    if (!userSentenceInput.trim()) return;

    const input = userSentenceInput.toLowerCase().trim();
    let translation = 'ترجمة تقريبية غير متوفرة';
    let grammarNote = 'تتكون الجملة من تركيب لغوي قياسي.';
    const wordAnalyses: { word: string; pos: string; analysis: string }[] = [];

    const tokens = userSentenceInput.split(/\s+/);
    tokens.forEach((token) => {
      const clean = token.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
      const cleanLower = clean.toLowerCase();

      if (['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie/sie'].includes(cleanLower)) {
        wordAnalyses.push({ word: clean, pos: 'ضمير فاعل (Personalpronomen)', analysis: 'ضمير شخصي مبني في محل رفع مبتدأ.' });
      } else if (['bin', 'bist', 'ist', 'sind', 'seid', 'war', 'gewesen'].includes(cleanLower)) {
        wordAnalyses.push({ word: clean, pos: 'فعل مساعد (sein)', analysis: 'فعل الكينونة المصرف، يربط المبتدأ بالخبر.' });
      } else if (['hallo', 'guten', 'morgen', 'tag', 'abend'].includes(cleanLower)) {
        wordAnalyses.push({ word: clean, pos: 'صيغة تحية (Grußformel)', analysis: 'تعبير ترحيبي قياسي يستخدم في التواصل الاجتماعي.' });
      } else if (['danke', 'bitte'].includes(cleanLower)) {
        wordAnalyses.push({ word: clean, pos: 'تعبير مجاملة', analysis: 'يستخدم لشكر المقابل أو الرد على الشكر.' });
      } else if (cleanLower === 'deutsch') {
        wordAnalyses.push({ word: clean, pos: 'اسم مفعول / لغة', analysis: 'اللغة الألمانية، مفعول به منصوب.' });
      } else if (cleanLower === 'lerne' || cleanLower === 'lernen') {
        wordAnalyses.push({ word: clean, pos: 'فعل أساسي (Verb)', analysis: 'يدل على حدث التعلم في زمن الحاضر.' });
      } else {
        wordAnalyses.push({ word: clean, pos: 'مفردة نحوية', analysis: 'عنصر بنيوي يثري السياق الدلالي للجملة.' });
      }
    });

    if (input.includes('hallo')) {
      translation = 'مرحباً!';
      grammarNote = 'جملة ترحيبية بسيطة لا تشتمل على فعل معقد.';
    } else if (input.includes('ich lerne deutsch')) {
      translation = 'أنا أتعلم الألمانية.';
      grammarNote = 'جملة فعلية بسيطة تتكون من فاعل (Ich) وفعل مصرف (lerne) ومفعول به مباشر (Deutsch).';
    } else if (input.includes('wie geht es dir')) {
      translation = 'كيف حالك؟';
      grammarNote = 'سؤال مركب غير رسمي، يستخدم حالة الجر dir للمخاطب الودي.';
    }

    setAnalyzerResult({
      translation,
      words: wordAnalyses,
      grammarNote
    });
  };

  // Placement Test Simulator
  const PLACEMENT_QUESTIONS = [
    { q: "Wie heißt du? \n (اختر الإجابة الصحيحة)", options: ["Ich bin Ahmad", "Ich danke dir", "Guten Morgen"], correct: 0 },
    { q: "Das ist ___ Mutter. \n (أمي - مؤنث)", options: ["mein", "meine", "dein"], correct: 1 },
    { q: "Ich stehe um 7 Uhr ___. \n (فعل منفصل)", options: ["auf", "an", "aus"], correct: 0 },
    { q: "Ich lerne Deutsch, ___ ich in Deutschland lebe.", options: ["weil", "dass", "aber"], correct: 0 },
    { q: "Das Auto ___ von dem Mechaniker repariert. \n (المبني للمجهول)", options: ["wird", "werden", "ist"], correct: 0 }
  ];

  const handlePlacementAnswer = (idx: number) => {
    let currentScore = placementScore;
    if (idx === PLACEMENT_QUESTIONS[placementStep].correct) {
      currentScore += 20;
      setPlacementScore(currentScore);
    }

    if (placementStep < PLACEMENT_QUESTIONS.length - 1) {
      setPlacementStep((s) => s + 1);
    } else {
      let level = 'A0 - التمهيدي البدائي';
      if (currentScore >= 100) level = 'C1 - الطلاقة والاحترافية';
      else if (currentScore >= 80) level = 'B2 - المتقدم المتمكن';
      else if (currentScore >= 60) level = 'B1 - المتوسط الأساسي';
      else if (currentScore >= 40) level = 'A2 - المبتدئ الأساسي';
      else if (currentScore >= 20) level = 'A1 - المبتدئ التأسيسي';

      setPlacementResult(level);
      toast.success('تمت معالجة اختبار تحديد المستوى بنجاح!');
    }
  };

  const resetPlacement = () => {
    setPlacementStarted(false);
    setPlacementStep(0);
    setPlacementScore(0);
    setPlacementResult(null);
  };

  // Dialogue Sandbox
  const activeDialogue = useMemo(() => {
    return SYSTEMATIC_DIALOGUE_SCENARIOS.find((d) => d.id === selectedDialogueId);
  }, [selectedDialogueId]);

  const handleChooseBranch = (branchId: string) => {
    setDialogueUserBranchChoice(branchId);
    setDialogueStep('outcome');
  };

  // Verb Conjugator
  const activeVerb = useMemo(() => {
    return SYSTEMATIC_VERB_CONJUGATIONS.find((v) => v.id === selectedVerbId) || SYSTEMATIC_VERB_CONJUGATIONS[0];
  }, [selectedVerbId]);

  // Suffix Rules
  const filteredSuffixRules = useMemo(() => {
    const query = genderSuffixQuery.toLowerCase().trim();
    return SYSTEMATIC_SUFFIX_GENDER_RULES.filter((rule) =>
      rule.suffix.toLowerCase().includes(query) || rule.explanation_ar.includes(query)
    );
  }, [genderSuffixQuery]);

  const genderQuizItems = useMemo(() => {
    return SYSTEMATIC_SUFFIX_GENDER_RULES.map((rule) => ({
      word: rule.example_de.split(' ')[1],
      correctGender: rule.gender,
      suffix: rule.suffix,
      explanation: rule.explanation_ar,
    }));
  }, []);

  const currentGenderQuizItem = genderQuizItems[genderQuizIndex];

  const handleGenderQuizAnswer = (selected: 'der' | 'die' | 'das') => {
    setGenderQuizSelected(selected);
    const isCorrect = selected === currentGenderQuizItem.correctGender;
    if (isCorrect) {
      setGenderQuizScore((s) => s + 20);
    }
    setGenderQuizFdbk({
      correct: isCorrect,
      msg: isCorrect
        ? 'أحسنت! الإجابة صحيحة تماماً بناء على لاحقة الاسم النحوية.'
        : `خيار غير دقيق. التحديد الصائب هو (${currentGenderQuizItem.correctGender}) بسبب انتهاء الكلمة باللاحقة (${currentGenderQuizItem.suffix}).`
    });
  };

  const handleNextGenderQuiz = () => {
    setGenderQuizSelected(null);
    setGenderQuizFdbk(null);
    if (genderQuizIndex < genderQuizItems.length - 1) {
      setGenderQuizIndex((idx) => idx + 1);
    } else {
      toast.success(`أكملت مسابقة اللواحق بنجاح! رصيدك: ${genderQuizScore} نقطة.`);
    }
  };

  const resetGenderQuiz = () => {
    setGenderQuizIndex(0);
    setGenderQuizScore(0);
    setGenderQuizSelected(null);
    setGenderQuizFdbk(null);
    setGenderQuizActive(true);
  };

  if (activeSessionMinutes !== null) {
    return (
      <PageShell flush centered={false}>
        <ExerciseSession
          minutes={activeSessionMinutes}
          lessonId={activeLessonId}
          onClose={() => {
            setActiveSessionMinutes(null);
            setActiveLessonId(undefined);
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell flush centered={false}>
      <Helmet>
        <title>تعلم الألمانية | Zen Elite VIP</title>
        <meta name="theme-color" content="#080808" />
      </Helmet>

      {/* Ambient background glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col pb-page">
        {/* Luxury Header */}
        <div className="app-header-chrome">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <Link to="/"><ArrowLeft className="h-6 w-6 text-muted-foreground" /></Link>
            <div className="flex flex-col items-end text-end">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-plex-mono text-micro font-bold uppercase">
                  VIP PASS
                </span>
                <h1 className="font-amiri text-lead font-bold tracking-wide text-foreground">
                  ديوان الألمانية الحديثة
                </h1>
              </div>
              <p className="font-tajawal text-micro text-muted-foreground font-medium uppercase tracking-widest">
                Deutsch Masterclass
              </p>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-lg flex-1 p-4 space-y-6 mt-2">

          {/* Heavy-weight VIP Subscription Banner */}
          <VipSubscriptionBanner
            isVipActive={isVipActive}
            onToggleVip={(active) => setIsVipActive(active)}
          />

          {/* User Metrics & Progress Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Crown className="w-28 h-28" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex-1 space-y-3">
                <div className="space-y-0.5 text-end">
                  <h2 className="font-tajawal text-meta font-bold text-foreground">
                    المستوى النشط: {currentLevelObj.name_ar}
                  </h2>
                  <p className="font-tajawal text-mini text-muted-foreground">
                    إتقان مستمر وتراكمي للغة الألمانية
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-mini font-mono font-medium text-muted-foreground">
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

              <div className="flex items-center gap-5 justify-end md:justify-center">
                <div className="text-center">
                  <span className="block text-micro text-muted-foreground uppercase tracking-widest font-tajawal mb-0.5">نقاط الخبرة</span>
                  <span className="font-plex-mono text-lead font-bold text-foreground">{stats?.xp || 0}</span>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                  <span className="block text-micro text-muted-foreground uppercase tracking-widest font-tajawal mb-0.5">أيام المواظبة</span>
                  <div className="flex items-center gap-1 justify-center">
                    <Zap className="h-3.5 w-3.5 text-[hsl(var(--live))]" />
                    <span className="font-plex-mono text-lead font-bold text-[hsl(var(--live))]">{stats?.streak_days || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Section Tabs */}
          <div className="flex gap-1.5 overflow-x-auto p-1 rounded-xl bg-secondary/30 border border-border/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'shelves', text: '🔥 رفوف المواقف والظروف', highlight: true },
              { id: 'lessons', text: '📚 خارطة الدروس' },
              { id: 'handbook', text: '📖 القواعد النحوية' },
              { id: 'dictionary', text: '🔍 القاموس الشامل' },
              { id: 'tutor', text: '🤖 محلل الجمل' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`shrink-0 whitespace-nowrap py-2 px-3 text-center rounded-lg font-tajawal text-mini font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-card text-[hsl(var(--live))] shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  {tab.text}
                </button>
              );
            })}
          </div>

          {/* Secondary Advanced Interactive Tools Panel */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <span className="h-px flex-1 bg-border/30" />
              <span className="font-tajawal text-micro text-muted-foreground font-bold uppercase tracking-widest bg-secondary/20 px-2 py-0.5 rounded border border-border/30">
                أدوات التفاعل والمحاكاة المتقدمة
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto p-1 rounded-xl bg-secondary/20 border border-border/25 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: 'dialogues', text: '💬 السيناريوهات الحرة' },
                { id: 'conjugator', text: '⚡ تصريف الأفعال' },
                { id: 'gender', text: '🏷️ جنس الأسماء' },
                { id: 'phonetics', text: '🔊 صوتيات المخارج' },
                { id: 'placement', text: '🧭 اختبار المستوى' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`shrink-0 whitespace-nowrap py-2 px-3 text-center rounded-lg font-tajawal text-mini font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] border border-[hsl(var(--live))]/30 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent'
                    }`}
                  >
                    {tab.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 0: Situational Shelves (FEATURED PRIMARY EXPERIENCE FOR GEN Z) */}
          {activeTab === 'shelves' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <SituationalShelves
                isVipUnlocked={isVipActive}
                onSelectPracticeItem={(item) => {
                  toast.success(`تمت إضافة "${item.german_text}" للتمارين والمراجعة الذكية`);
                  setActiveLessonId(undefined);
                  setActiveSessionMinutes(5);
                }}
              />
            </motion.div>
          )}

          {/* Tab 1: Lessons Mapping */}
          {activeTab === 'lessons' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Level Switcher (Tabs) */}
              <div className="relative w-full rounded-xl bg-secondary/30 p-1 flex items-center gap-1 border border-border/40 backdrop-blur-sm">
                {(['A0', 'A1', 'A2', 'B1', 'B2', 'C1'] as const).map((level) => {
                  const isActive = activeLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setActiveLevel(level)}
                      className={`relative flex-1 py-2 text-center rounded-lg font-tajawal text-mini font-bold transition-all duration-300 ${
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
                      <h4 className="font-tajawal text-meta font-bold text-foreground">
                        المراجعة الذكية المتباعدة (FSRS)
                      </h4>
                      <p className="text-mini text-muted-foreground leading-relaxed font-tajawal">
                        خوارزمية الفواصل الذكية تضمن بقاء الكلمات والتراكيب الألمانية في ذاكرتك طويلة الأجل بكفاءة متناهية.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[140px]">
                    <div className="flex items-center justify-between bg-background/50 px-3 py-2 rounded-lg border border-border/50">
                      <span className="font-tajawal text-micro text-muted-foreground">مستحقة للمراجعة</span>
                      <span className="font-plex-mono text-meta font-bold text-foreground">{pendingSrsReviews || STARTER_VOCABULARY.length}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveLessonId(undefined);
                        setActiveSessionMinutes(5);
                      }}
                      className="w-full py-2.5 bg-[hsl(var(--live))] text-white hover:bg-[hsl(var(--live))]/90 rounded-lg text-mini font-bold font-tajawal shadow-sm transition-transform active:scale-95"
                    >
                      ابدأ الجلسة الشاملة (5 دقائق)
                    </button>
                  </div>
                </div>
              </div>

              {/* CEFR Level Map */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 justify-end px-2">
                  <span className="h-px flex-1 bg-border/40" />
                  <h3 className="font-amiri text-lead font-bold text-foreground">
                    خريطة الدروس الرسمية
                  </h3>
                </div>

                {unitsInActiveLevel.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/50 bg-secondary/10 space-y-4" dir="rtl">
                    <div className="p-4 bg-secondary/30 text-muted-foreground rounded-full">
                      <HelpCircle className="h-6 w-6" />
                    </div>
                    <h4 className="font-tajawal text-meta font-bold text-foreground">المحتوى قيد التطوير</h4>
                    <p className="font-tajawal text-mini text-muted-foreground max-w-[250px]">
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
                                <h4 className="font-tajawal text-meta font-bold text-foreground">
                                  {unit.title_ar}
                                </h4>
                                <p className="font-plex-mono text-micro font-extrabold text-foreground/80 tracking-wide mt-0.5" dir="ltr">
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
                                  onClick={() => {
                                    setActiveLessonId(lesson.id);
                                    setActiveSessionMinutes(5);
                                  }}
                                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between group/lesson cursor-pointer ${
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
                                      <h5 className={`font-tajawal text-meta font-bold ${isCompleted ? 'text-foreground' : 'text-foreground/90'}`}>
                                        {lesson.title_ar}
                                      </h5>
                                      <div className="flex items-center gap-2" dir="ltr">
                                        <span className="font-plex-mono text-micro font-bold text-foreground">
                                          {lesson.title_de}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span className="font-tajawal text-mini text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-secondary/50">
                                          {lesson.type}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    {!isCompleted && (
                                      <button
                                        onClick={() => handleLessonCompleteDirectly(lesson.id)}
                                        className="px-3 py-1.5 rounded-lg bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] hover:bg-[hsl(var(--live))]/20 text-mini font-bold font-tajawal transition-all"
                                      >
                                        إنجاز
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
            </motion.div>
          )}

          {/* Tab 2: Grammar Handbook */}
          {activeTab === 'handbook' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">دليل القواعد الألماني الشامل</h3>
                <p className="font-tajawal text-mini text-muted-foreground">
                  {STARTER_GRAMMAR_POINTS.length} قاعدة نحوية مشروحة بجسور مقارنة مع النحو العربي الأصيل
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {STARTER_GRAMMAR_POINTS.map((gp) => (
                  <div key={gp.id} className="p-5 rounded-2xl border border-border/40 bg-card space-y-4">
                    <div className="flex items-center gap-3 justify-end">
                      <span className="text-mini font-plex-mono px-2 py-0.5 bg-secondary text-muted-foreground rounded uppercase">Grammar Node</span>
                      <h4 className="font-tajawal text-meta font-bold text-foreground">{gp.name}</h4>
                    </div>

                    <p className="font-tajawal text-mini text-muted-foreground leading-relaxed text-end">
                      {gp.explanation_ar}
                    </p>

                    {gp.contrastive_note_ar && (
                      <div className="p-4 rounded-xl bg-[hsl(var(--live))]/5 border border-[hsl(var(--live))]/20 space-y-2 text-end">
                        <span className="block font-tajawal text-micro font-bold text-[hsl(var(--live))]">الجسر النحوي المقارن مع العربية</span>
                        <p className="font-amiri text-meta text-foreground/90 leading-relaxed">
                          {gp.contrastive_note_ar}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab 3: Dictionary & Flashcard Explorer */}
          {activeTab === 'dictionary' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">القاموس ومستودع المفردات</h3>
                <p className="font-tajawal text-mini text-muted-foreground">
                  استكشف المستودع الكامل: {corpusTotals.words} كلمة، {corpusTotals.sentences} جملة، {corpusTotals.phrases} عبارة،
                  و{corpusTotals.expressions} تعبيراً.
                </p>
              </div>

              {/* Sub-tabs for corpus types */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-secondary/20">
                {[
                  { id: 'words', text: 'كلمات', count: corpusTotals.words },
                  { id: 'sentences', text: 'جمل', count: corpusTotals.sentences },
                  { id: 'phrases', text: 'عبارات', count: corpusTotals.phrases },
                  { id: 'expressions', text: 'تعبيرات', count: corpusTotals.expressions }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setDictType(type.id as any);
                      setFlippedCardId(null);
                    }}
                    className={`py-2 flex flex-col items-center gap-0.5 rounded-lg font-tajawal text-mini font-bold transition-all ${
                      dictType === type.id
                        ? 'bg-card text-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{type.text}</span>
                    <span className="font-plex-mono text-micro opacity-70">{type.count}</span>
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <select
                  value={dictLevelFilter}
                  onChange={(e) => setDictLevelFilter(e.target.value)}
                  className="p-2 text-mini rounded-xl border border-border/40 bg-card text-foreground font-tajawal focus:outline-none"
                >
                  <option value="all">كل المستويات</option>
                  <option value="lvl-a0">A0</option>
                  <option value="lvl-a1">A1</option>
                  <option value="lvl-a2">A2</option>
                  <option value="lvl-b1">B1</option>
                  <option value="lvl-b2">B2</option>
                  <option value="lvl-c1">C1</option>
                </select>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالألمانية أو العربية..."
                    className="w-full pe-8 ps-4 py-2 text-mini rounded-xl border border-border/40 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:border-[hsl(var(--live))]"
                    dir="rtl"
                  />
                  <Search className="absolute end-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Flashcard Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-card">
                <span className="font-tajawal text-mini text-muted-foreground">قم بتفعيل مراجعة الفلاش كارد التفاعلية السريعة للحفظ</span>
                <button
                  onClick={() => setDictFlashcardMode(!dictFlashcardMode)}
                  className={`px-3 py-1.5 rounded-lg text-mini font-bold font-tajawal transition-all ${
                    dictFlashcardMode
                      ? 'bg-[hsl(var(--live))] text-white'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {dictFlashcardMode ? 'تعطيل الحفظ' : 'تفعيل الحفظ'}
                </button>
              </div>

              {/* Rendered Corpus Items */}
              <div className="flex items-center justify-between px-1">
                <span className="font-tajawal text-micro text-muted-foreground">
                  {matchedDictItems.length > 0
                    ? `يُعرض ${filteredDictItems.length} من ${matchedDictItems.length}`
                    : 'لا نتائج'}
                </span>
                <span className="h-px flex-1 mx-3 bg-border/40" />
                <span className="font-tajawal text-micro font-bold text-muted-foreground">نتائج البحث</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredDictItems.map((item: any) => {
                  const isFlipped = flippedCardId === item.id;

                  if (dictFlashcardMode) {
                    return (
                      <div
                        key={item.id}
                        onClick={() => setFlippedCardId(isFlipped ? null : item.id)}
                        className="p-6 rounded-2xl border border-border/50 bg-card text-center cursor-pointer transition-all hover:shadow-md min-h-[140px] flex flex-col justify-center items-center gap-3 relative overflow-hidden"
                      >
                        <span className="absolute top-2 left-2 font-plex-mono text-micro text-muted-foreground uppercase">
                          {item.level_id?.replace('lvl-', '') || 'A0'}
                        </span>

                        {!isFlipped ? (
                          <div className="space-y-1">
                            <h4 className="font-plex-mono text-title font-extrabold text-foreground">
                              {item.lemma_de || item.text_de}
                            </h4>
                            <p className="font-tajawal text-micro text-muted-foreground uppercase tracking-widest">اضغط لإظهار المعنى</p>
                          </div>
                        ) : (
                          <div className="space-y-2 animate-in fade-in zoom-in-95">
                            <h4 className="font-tajawal text-mini text-muted-foreground font-semibold">
                              {item.translation_ar || item.text_ar}
                            </h4>
                            {item.example_sentence_de && (
                              <p className="font-plex-mono text-mini font-bold text-foreground italic" dir="ltr">{item.example_sentence_de}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="p-4 rounded-xl border border-border/40 bg-card space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="font-plex-mono text-micro text-muted-foreground bg-secondary px-1.5 py-0.5 rounded uppercase">
                          {item.level_id?.replace('lvl-', '') || 'A0'}
                        </span>
                        <div className="text-end">
                          <h4 className="font-plex-mono text-body font-extrabold text-foreground tracking-wide" dir="ltr">
                            {item.lemma_de || item.text_de}
                          </h4>
                          <p className="font-tajawal text-mini text-muted-foreground mt-0.5 font-medium">
                            {item.translation_ar || item.text_ar}
                          </p>
                        </div>
                      </div>

                      {item.example_sentence_de && (
                        <div className="border-t border-border/25 pt-2 mt-2 space-y-0.5 text-end">
                          <p className="font-plex-mono text-mini font-bold text-foreground" dir="ltr">{item.example_sentence_de}</p>
                          <p className="font-tajawal text-mini text-muted-foreground">{item.example_sentence_ar}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {matchedDictItems.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 p-10 text-center rounded-2xl border border-dashed border-border/50 bg-secondary/10" dir="rtl">
                  <div className="p-3 bg-secondary/30 text-muted-foreground rounded-full">
                    <Search className="h-5 w-5" />
                  </div>
                  <h4 className="font-tajawal text-meta font-bold text-foreground">لا توجد نتائج مطابقة</h4>
                  <p className="font-tajawal text-mini text-muted-foreground max-w-[260px]">
                    جرّب كلمة أخرى بالألمانية أو العربية.
                  </p>
                </div>
              )}

              {filteredDictItems.length < matchedDictItems.length && (
                <button
                  onClick={() => setDictPage({ key: dictFilterKey, count: dictVisibleCount + 30 })}
                  className="w-full py-3 rounded-xl border border-border/50 bg-card font-tajawal text-mini font-bold text-foreground hover:border-[hsl(var(--live))]/40 hover:text-[hsl(var(--live))] transition-all active:scale-[0.99]"
                >
                  عرض المزيد ({matchedDictItems.length - filteredDictItems.length} متبقية)
                </button>
              )}
            </motion.div>
          )}

          {/* Tab 4: AI Grammatical Tutor */}
          {activeTab === 'tutor' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">مساعد الذكاء اللغوي</h3>
                <p className="font-tajawal text-mini text-muted-foreground">اكتب أي جملة ألمانية وسيقوم المحلل بتفكيكها وفهمها إعرابياً بشكل مفصل فوراً</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/40 bg-card space-y-4">
                <div className="space-y-1.5 text-end">
                  <label className="font-tajawal text-mini font-bold text-foreground">الجملة المراد تحليلها</label>
                  <input
                    type="text"
                    value={userSentenceInput}
                    onChange={(e) => setUserSentenceInput(e.target.value)}
                    placeholder="e.g. Ich lerne Deutsch"
                    className="w-full p-3.5 rounded-xl border border-border/40 bg-background text-foreground font-plex-mono font-bold text-meta tracking-wide text-center focus:outline-none focus:ring-1 focus:ring-[hsl(var(--live))]"
                    dir="ltr"
                  />
                </div>

                <button
                  onClick={handleAnalyzeSentence}
                  className="w-full py-3 bg-[hsl(var(--live))] hover:bg-[hsl(var(--live))]/90 text-white rounded-xl text-mini font-bold font-tajawal transition-all"
                >
                  تحليل التركيب النحوي
                </button>
              </div>

              {analyzerResult && (
                <div className="p-5 rounded-2xl border border-border/50 bg-card space-y-5 animate-in fade-in duration-300">
                  <div className="text-end space-y-1">
                    <span className="text-micro font-plex-mono text-[hsl(var(--live))] font-semibold uppercase tracking-wider">الترجمة الدلالية</span>
                    <p className="font-tajawal text-mini text-muted-foreground font-semibold">{analyzerResult.translation}</p>
                  </div>

                  <div className="border-t border-border/30 pt-4 space-y-3">
                    <span className="block text-end text-micro font-plex-mono text-[hsl(var(--live))] font-semibold uppercase tracking-wider">تفكيك الكلمات النحوي</span>
                    <div className="grid grid-cols-1 gap-2">
                      {analyzerResult.words.map((item, index) => (
                        <div key={index} className="p-3 rounded-xl bg-background border border-border/40 flex items-center justify-between">
                          <span className="font-tajawal text-mini text-muted-foreground max-w-[180px] text-start">{item.analysis}</span>
                          <div className="text-end">
                            <span className="block font-plex-mono text-meta font-bold text-foreground" dir="ltr">{item.word}</span>
                            <span className="block font-tajawal text-mini text-[hsl(var(--live))]/80">{item.pos}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-4 text-end space-y-1">
                    <span className="text-micro font-plex-mono text-[hsl(var(--live))] font-semibold uppercase tracking-wider">الشرح الإجمالي</span>
                    <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">{analyzerResult.grammarNote}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 6: Interactive Dialogue Sandbox */}
          {activeTab === 'dialogues' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">محاكي المحادثات والسيناريوهات الحرة</h3>
                <p className="font-tajawal text-mini text-muted-foreground">تفاوض وتكلم في سياقات حقيقية مع ردود فعل وتحليلات ثقافية دقيقة.</p>
              </div>

              {!selectedDialogueId ? (
                <div className="grid grid-cols-1 gap-4">
                  {SYSTEMATIC_DIALOGUE_SCENARIOS.map((scen) => (
                    <div key={scen.id} className="p-5 rounded-2xl border border-border/40 bg-card space-y-4 text-end">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-micro font-plex-mono bg-secondary text-muted-foreground uppercase">{scen.category}</span>
                        <h4 className="font-tajawal text-meta font-bold text-foreground">{scen.title_ar}</h4>
                      </div>
                      <p className="font-plex-mono text-mini font-bold text-foreground/90 italic" dir="ltr">{scen.title_de}</p>
                      <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">{scen.description_ar}</p>
                      <button
                        onClick={() => {
                          setSelectedDialogueId(scen.id);
                          setDialogueStep('intro');
                          setDialogueUserBranchChoice(null);
                        }}
                        className="w-full py-2.5 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-mini font-bold font-tajawal transition-all"
                      >
                        دخول المحاكاة التفاعلية
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedDialogueId(null);
                      }}
                      className="px-3 py-1 bg-secondary text-foreground rounded text-mini font-tajawal"
                    >
                      إنهاء المحاكاة
                    </button>
                    <h4 className="font-tajawal text-meta font-bold text-foreground">{activeDialogue?.title_ar}</h4>
                  </div>

                  {dialogueStep === 'intro' && (
                    <div className="space-y-5 text-end">
                      <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
                        {activeDialogue?.description_ar}
                      </p>
                      <button
                        onClick={() => setDialogueStep('chat')}
                        className="w-full py-3 bg-[hsl(var(--live))] text-white rounded-xl font-tajawal text-mini font-bold"
                      >
                        ابدأ المحادثة التفاعلية
                      </button>
                    </div>
                  )}

                  {dialogueStep === 'chat' && (
                    <div className="space-y-5">
                      <div className="flex justify-between items-center bg-secondary/30 p-2 rounded-lg">
                        <button
                          onClick={() => setDialogueShowArTranslation(!dialogueShowArTranslation)}
                          className="text-micro font-tajawal text-muted-foreground"
                        >
                          {dialogueShowArTranslation ? 'إخفاء الترجمة العربية' : 'إظهار الترجمة العربية'}
                        </button>
                        <span className="text-micro font-tajawal text-muted-foreground">سياق المحادثة المبدئي</span>
                      </div>

                      <div className="space-y-4">
                        {activeDialogue?.turns.map((turn, index) => (
                          <div
                            key={index}
                            className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                              turn.speaker.includes('Du')
                                ? 'bg-[hsl(var(--live))]/5 border-[hsl(var(--live))]/20 items-end text-end'
                                : 'bg-secondary/40 border-border/30 items-start text-start'
                            }`}
                          >
                            <span className="text-micro font-bold text-muted-foreground uppercase">{turn.speaker}</span>
                            <p className="font-plex-mono text-meta font-bold text-foreground" dir="ltr">{turn.text_de}</p>
                            {dialogueShowArTranslation && (
                              <p className="font-tajawal text-mini text-muted-foreground" dir="rtl">{turn.text_ar}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setDialogueStep('branch')}
                        className="w-full py-3 bg-[hsl(var(--live))] text-white rounded-xl font-tajawal text-mini font-bold"
                      >
                        متابعة السيناريو واختيار ردك
                      </button>
                    </div>
                  )}

                  {dialogueStep === 'branch' && (
                    <div className="space-y-5 text-end">
                      <span className="text-micro font-tajawal text-[hsl(var(--live))] font-bold uppercase tracking-wider">الآن، حان دورك للتكلم! اختر ردك بحذر:</span>
                      <div className="grid grid-cols-1 gap-3">
                        {activeDialogue?.branches.map((branch) => (
                          <button
                            key={branch.id}
                            onClick={() => handleChooseBranch(branch.id)}
                            className="w-full p-4 rounded-xl border border-border/40 hover:border-[hsl(var(--live))] bg-card hover:bg-secondary/40 text-end font-tajawal text-mini transition-all flex items-center justify-between"
                          >
                            <span className="h-2 w-2 rounded-full border border-border/40" />
                            <span>{branch.option_ar}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {dialogueStep === 'outcome' && (
                    <div className="space-y-6">
                      {(() => {
                        const selectedBranch = activeDialogue?.branches.find((b) => b.id === dialogueUserBranchChoice);
                        if (!selectedBranch) return null;
                        return (
                          <div className="space-y-5">
                            <div className={`p-5 rounded-xl border text-center space-y-3 ${
                              selectedBranch.is_correct_action
                                ? 'bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-600'
                                : 'bg-rose-500/[0.02] border-rose-500/20 text-rose-600'
                            }`}>
                              <span className="block font-tajawal text-micro font-bold uppercase">الرد الذي قمت باختياره</span>
                              <p className="font-plex-mono text-body font-bold text-foreground" dir="ltr">{selectedBranch.response_de}</p>
                              <p className="font-tajawal text-mini text-muted-foreground" dir="rtl">{selectedBranch.response_ar}</p>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => setDialogueStep('branch')}
                                className="flex-1 py-3 border border-border/40 bg-card text-foreground rounded-xl text-mini font-bold font-tajawal"
                              >
                                جرب خياراً آخر
                              </button>
                              <button
                                onClick={() => setSelectedDialogueId(null)}
                                className="flex-1 py-3 bg-[hsl(var(--live))] text-white rounded-xl text-mini font-bold font-tajawal"
                              >
                                إنهاء السيناريو
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 7: Systematic Verb Conjugator */}
          {activeTab === 'conjugator' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">المصرف النحوي الرقمي للأفعال</h3>
                <p className="font-tajawal text-mini text-muted-foreground">صرف وافهم الأفعال الألمانية الهامة مع شرح جسورها الزمنية المقارنة بالعربية.</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedVerbId}
                  onChange={(e) => setSelectedVerbId(e.target.value)}
                  className="w-full p-3.5 text-end rounded-xl border border-border/40 bg-card text-foreground font-tajawal focus:outline-none"
                >
                  {SYSTEMATIC_VERB_CONJUGATIONS.map((v) => (
                    <option key={v.id} value={v.id}>{v.verb_de} ({v.translation_ar})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/30">
                <button
                  onClick={() => setConjugatorTense('present')}
                  className={`py-2 text-center rounded-lg font-tajawal text-mini font-bold transition-all ${
                    conjugatorTense === 'present' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  الحاضر البسيط (Präsens)
                </button>
                <button
                  onClick={() => setConjugatorTense('perfekt')}
                  className={`py-2 text-center rounded-lg font-tajawal text-mini font-bold transition-all ${
                    conjugatorTense === 'perfekt' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  الماضي التام (Perfekt)
                </button>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-border/30">
                  <span className="font-plex-mono text-mini text-muted-foreground uppercase">Conjugation Forms</span>
                  <h4 className="font-plex-mono text-title font-bold text-[hsl(var(--live))]" dir="ltr">{activeVerb.verb_de}</h4>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {[
                    { pr: 'ich (أنا)', form: activeVerb[conjugatorTense].ich },
                    { pr: 'du (أنت)', form: activeVerb[conjugatorTense].du },
                    { pr: 'er / sie / es (هو/هي)', form: activeVerb[conjugatorTense].er_sie_es },
                    { pr: 'wir (نحن)', form: activeVerb[conjugatorTense].wir },
                    { pr: 'ihr (أنتم)', form: activeVerb[conjugatorTense].ihr },
                    { pr: 'sie / Sie (هم / حضرتك)', form: activeVerb[conjugatorTense].sie_Sie }
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/40 hover:border-[hsl(var(--live))]/20 transition-all">
                      <span className="font-plex-mono text-body font-bold text-foreground" dir="ltr">{row.form}</span>
                      <span className="font-tajawal text-mini text-muted-foreground">{row.pr}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/35 pt-4 space-y-4 text-end">
                  <div className="p-4 bg-[hsl(var(--live))]/5 rounded-xl space-y-1">
                    <span className="block text-micro font-tajawal text-[hsl(var(--live))] font-bold uppercase">مثال تطبيقي مصرف</span>
                    <p className="font-plex-mono text-meta font-bold text-foreground" dir="ltr">{activeVerb.german_example_de}</p>
                    <p className="font-tajawal text-mini text-muted-foreground">{activeVerb.german_example_ar}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 8: Suffix-Based Gender Memory & Quiz */}
          {activeTab === 'gender' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">مصفوفة لواحق وقواعد الجنس النحوي</h3>
                <p className="font-tajawal text-mini text-muted-foreground">احفظ لواحق الكلمات الألمانية لمعرفة جنسها (der/die/das) تلقائياً بنسبة 100%.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setGenderQuizActive(false)}
                  className={`flex-1 py-2.5 rounded-xl border font-tajawal text-mini font-bold transition-all ${
                    !genderQuizActive
                      ? 'bg-card text-foreground border-border/50 shadow'
                      : 'bg-secondary/40 text-muted-foreground border-transparent'
                  }`}
                >
                  استكشاف اللواحق
                </button>
                <button
                  onClick={resetGenderQuiz}
                  className={`flex-1 py-2.5 rounded-xl border font-tajawal text-mini font-bold transition-all ${
                    genderQuizActive
                      ? 'bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] border-[hsl(var(--live))]/30 shadow'
                      : 'bg-secondary/40 text-muted-foreground border-transparent'
                  }`}
                >
                  مسابقة اللواحق التفاعلية
                </button>
              </div>

              {!genderQuizActive ? (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={genderSuffixQuery}
                      onChange={(e) => setGenderSuffixQuery(e.target.value)}
                      placeholder="ابحث عن لاحقة معينة (مثال: ung)..."
                      className="w-full pe-8 ps-4 py-3 text-mini rounded-xl border border-border/40 bg-card text-foreground focus:outline-none"
                      dir="rtl"
                    />
                    <Search className="absolute end-2.5 top-3 h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {filteredSuffixRules.map((rule, idx) => (
                      <div key={idx} className="p-5 rounded-2xl border border-border/40 bg-card space-y-3 text-end">
                        <div className="flex justify-between items-center">
                          <span className={`px-2.5 py-0.5 rounded text-micro font-plex-mono uppercase font-bold ${
                            rule.gender === 'der'
                              ? 'bg-blue-500/10 text-blue-500'
                              : rule.gender === 'die'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {rule.gender}
                          </span>
                          <h4 className="font-plex-mono text-body font-bold text-foreground">Suffix: -{rule.suffix}</h4>
                        </div>
                        <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
                          {rule.explanation_ar}
                        </p>
                        <div className="p-3 bg-secondary/30 rounded-lg flex justify-between items-center" dir="ltr">
                          <span className="font-plex-mono text-mini text-foreground font-bold">{rule.example_de}</span>
                          <span className="font-tajawal text-mini text-muted-foreground">{rule.example_ar}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-6 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <span className="font-plex-mono text-mini font-bold text-[hsl(var(--live))]">النتيجة: {genderQuizScore}/100</span>
                    <span className="font-tajawal text-mini text-muted-foreground">السؤال {genderQuizIndex + 1} من {genderQuizItems.length}</span>
                  </div>

                  <div className="p-6 rounded-xl bg-background border border-border/40 text-center space-y-3">
                    <span className="text-micro font-tajawal text-muted-foreground">ما هي الأداة الصحيحة للاسم الموالي بناءً على لاحقته؟</span>
                    <p className="font-plex-mono text-hero font-bold text-foreground tracking-wide">
                      {currentGenderQuizItem.word}
                    </p>
                  </div>

                  {!genderQuizFdbk ? (
                    <div className="grid grid-cols-3 gap-3">
                      {(['der', 'die', 'das'] as const).map((genderOption) => (
                        <button
                          key={genderOption}
                          onClick={() => handleGenderQuizAnswer(genderOption)}
                          className="py-3 rounded-xl border border-border/40 font-plex-mono text-meta font-bold hover:bg-secondary/30 transition-all"
                        >
                          {genderOption}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button
                        onClick={handleNextGenderQuiz}
                        className="w-full py-3 bg-[hsl(var(--live))] text-white rounded-xl text-mini font-bold font-tajawal"
                      >
                        {genderQuizIndex < genderQuizItems.length - 1 ? 'السؤال الموالي' : 'عرض النتيجة النهائية'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 9: Phonetic Soundboard */}
          {activeTab === 'phonetics' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">لوحة الصوتيات والمخارج الألمانية المقارنة</h3>
                <p className="font-tajawal text-mini text-muted-foreground">تدرب على نطق وإخراج الحروف والتركيبات الألمانية الصعبة بمقارنتها مع مخارج الحروف العربية.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SYSTEMATIC_PHONETIC_BRIDGE_ITEMS.map((item) => {
                  const isSelected = selectedPhoneticId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedPhoneticId(isSelected ? null : item.id)}
                      className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                        isSelected
                          ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/5 shadow'
                          : 'border-border/40 bg-card hover:bg-secondary/40'
                      }`}
                    >
                      <span className="font-plex-mono text-display font-bold text-foreground">{item.sound_de}</span>
                      <span className="font-plex-mono text-mini text-muted-foreground">IPA: /{item.ipa}/</span>
                      <span className="font-tajawal text-micro text-muted-foreground max-w-[120px] truncate">{item.arabic_equivalent_ar}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Tab 5: Placement Test */}
          {activeTab === 'placement' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-end space-y-2">
                <h3 className="font-amiri text-display font-bold text-foreground">اختبار تحديد المستوى الذكي</h3>
                <p className="font-tajawal text-mini text-muted-foreground">أجب عن ٥ أسئلة دقيقة لتقييم مستواك الفعلي ووضعك في المسار المناسب تلقائياً</p>
              </div>

              {!placementStarted ? (
                <div className="p-8 rounded-2xl border border-border/40 bg-card text-center space-y-5">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--live))]/10 text-[hsl(var(--live))]">
                    <Compass className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-tajawal text-meta font-bold text-foreground">جاهز للتقييم الفوري؟</h4>
                    <p className="font-tajawal text-mini text-muted-foreground">تتنوع الأسئلة لتقيس استيعابك للقواعد والربط والمفردات.</p>
                  </div>
                  <button
                    onClick={() => setPlacementStarted(true)}
                    className="w-full py-3 bg-[hsl(var(--live))] text-white hover:bg-[hsl(var(--live))]/90 rounded-xl font-tajawal text-mini font-bold transition-all"
                  >
                    ابدأ الاختبار الفوري
                  </button>
                </div>
              ) : placementResult ? (
                <div className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] text-center space-y-6 animate-in zoom-in-95">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <Award className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <span className="font-tajawal text-micro font-bold text-emerald-600 uppercase">النتيجة النهائية</span>
                    <h4 className="font-tajawal text-title font-bold text-foreground">المستوى المقترح: {placementResult}</h4>
                    <p className="font-tajawal text-mini text-muted-foreground">حققت درجة {placementScore}% في الاختبار السريع.</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetPlacement}
                      className="flex-1 py-3 border border-border/40 bg-card text-foreground rounded-xl text-mini font-bold font-tajawal transition-all"
                    >
                      إعادة المحاولة
                    </button>
                    <button
                      onClick={() => {
                        if (placementResult.includes('B1')) setActiveLevel('B1');
                        else if (placementResult.includes('A2')) setActiveLevel('A2');
                        else if (placementResult.includes('A1')) setActiveLevel('A1');
                        else setActiveLevel('A0');
                        setActiveTab('lessons');
                      }}
                      className="flex-1 py-3 bg-[hsl(var(--live))] text-white rounded-xl text-mini font-bold font-tajawal transition-all"
                    >
                      اعتماد المستوى
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-6 animate-in slide-in-from-bottom-3">
                  <div className="flex items-center justify-between">
                    <span className="font-plex-mono text-mini font-bold text-[hsl(var(--live))]">درجتك الحالية: {placementScore}%</span>
                    <span className="font-tajawal text-mini text-muted-foreground">سؤال {placementStep + 1} من {PLACEMENT_QUESTIONS.length}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-background border border-border/40 text-center space-y-2">
                    <p className="font-plex-mono text-body font-bold text-foreground leading-relaxed whitespace-pre-line" dir="ltr">
                      {PLACEMENT_QUESTIONS[placementStep].q}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {PLACEMENT_QUESTIONS[placementStep].options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlacementAnswer(idx)}
                        className="w-full p-4 text-end rounded-xl border border-border/40 hover:border-[hsl(var(--live))] bg-card hover:bg-[hsl(var(--live))]/5 font-tajawal text-meta transition-all shadow-sm flex items-center justify-between"
                      >
                        <span className="h-2 w-2 rounded-full border border-border/60" />
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </main>
      </div>
    </PageShell>
  );
};

export default GermanHome;
