import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ArrowLeft, Award, Check, Sparkles, Volume2, X } from '@/lib/icons';

import { useBuildSession, useMarkLessonCompleted, useSubmitSrsReview, useUpdateStats } from '../hooks';
import {
  ListenChoosePayload,
  MatchingPairsPayload,
  McqPayload,
  SessionItem,
  SrsRating,
  TypeAnswerPayload,
  SentenceBuildPayload,
  FillBlankGrammarPayload,
  ErrorCorrectionPayload,
  CompoundWordDecompositionPayload,
} from '../types';
import { GermanGenderBadge } from './GermanGenderBadge';
import { PedagogicalBridge } from './PedagogicalBridge';

interface ExerciseSessionProps {
  minutes?: number;
  lessonId?: string;
  onClose: () => void;
}

// Clean and normalize answer inputs: stripping extra whitespace, symbols, punctuation
const cleanString = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const ExerciseSession: React.FC<ExerciseSessionProps> = ({
  minutes = 5,
  lessonId,
  onClose,
}) => {
  const { data: session, isLoading, isError } = useBuildSession(minutes, lessonId);
  const submitReview = useSubmitSrsReview();
  const updateStats = useUpdateStats();
  const markLessonComplete = useMarkLessonCompleted();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Matching pairs states
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [matchingSelectedRight, setMatchingSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());

  // Sentence build states
  const [builtTokens, setBuiltTokens] = useState<string[]>([]);

  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const items = useMemo(() => session?.items || [], [session]);
  const currentItem: SessionItem | undefined = items[currentIndex];

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setTypedAnswer('');
      setIsAnswerChecked(false);
      setIsCorrect(false);
      setMatchingSelectedLeft(null);
      setMatchingSelectedRight(null);
      setMatchedPairs(new Set());
      setBuiltTokens([]);
      setAttempts(0);
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    setSessionCompleted(true);
    const xpEarned = Math.max(10, score * 5);
    try {
      await updateStats.mutateAsync(xpEarned);
      toast.success(`اكتسبت ${xpEarned} نقطة خبرة!`, {
        icon: <Award className="h-5 w-5 text-[hsl(var(--live))]" />,
      });

      // Look up currentItem or items[0] for actual lessonId to update user progress
      const targetLessonId = lessonId || items[0]?.payload && (items[0] as any).lesson_id;
      if (targetLessonId) {
        await markLessonComplete(targetLessonId, score);
      } else if (items.length > 0 && items[0].exercise_id) {
        // Fallback or search in exercises list
        const allExercises = await import('../data/starterCourse').then(m => m.STARTER_EXERCISES);
        const matchEx = allExercises.find(e => e.id === items[0].exercise_id);
        if (matchEx?.lesson_id) {
          await markLessonComplete(matchEx.lesson_id, score);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePairClick = (side: 'left' | 'right', text: string) => {
    if (side === 'left') {
      setMatchingSelectedLeft((prev) => (prev === text ? null : text));
    } else {
      setMatchingSelectedRight((prev) => (prev === text ? null : text));
    }
  };

  useEffect(() => {
    if (currentItem?.type === 'matching_pairs' && matchingSelectedLeft && matchingSelectedRight) {
      const payload = currentItem.payload as MatchingPairsPayload;
      const isValid = payload.pairs.some((p) => p.left === matchingSelectedLeft && p.right === matchingSelectedRight);

      if (isValid) {
        setMatchedPairs((prev) => {
          const next = new Set(prev);
          next.add(`${matchingSelectedLeft}|${matchingSelectedRight}`);
          return next;
        });
        setScore((s) => s + 1);
      } else {
        toast.error('اقتران خاطئ، حاول مرة أخرى');
      }

      setMatchingSelectedLeft(null);
      setMatchingSelectedRight(null);
    }
  }, [matchingSelectedLeft, matchingSelectedRight, currentItem]);

  useEffect(() => {
    if (currentItem?.type === 'matching_pairs') {
      const payload = currentItem.payload as MatchingPairsPayload;
      if (matchedPairs.size === payload.pairs.length && payload.pairs.length > 0 && !isAnswerChecked) {
        setIsCorrect(true);
        setIsAnswerChecked(true);
      }
    }
  }, [matchedPairs, currentItem, isAnswerChecked]);

  const handleCheckAnswer = async () => {
    if (!currentItem) return;
    setAttempts((a) => a + 1);
    let correct = false;

    if (currentItem.type === 'mcq') {
      const p = currentItem.payload as McqPayload;
      const opt = p.options.find((o) => o.id === selectedOptionId);
      if (opt?.is_correct) correct = true;
    } else if (currentItem.type === 'listen_choose') {
      const p = currentItem.payload as ListenChoosePayload;
      if (p.correct_option_id === selectedOptionId) correct = true;
    } else if (currentItem.type === 'type_answer') {
      const p = currentItem.payload as TypeAnswerPayload;
      const cleanedInput = cleanString(typedAnswer);
      if (p.accepted_answers.some((a) => cleanString(a) === cleanedInput)) correct = true;
    } else if (currentItem.type === 'sentence_build') {
      const p = currentItem.payload as SentenceBuildPayload;
      const resultSentence = cleanString(builtTokens.join(' '));
      if (resultSentence === cleanString(p.correct_sentence)) correct = true;
    } else if (currentItem.type === 'fill_blank_grammar') {
      const p = currentItem.payload as FillBlankGrammarPayload;
      if (selectedOptionId && cleanString(selectedOptionId) === cleanString(p.correct_answer)) correct = true;
    } else if (currentItem.type === 'error_correction') {
      const p = currentItem.payload as ErrorCorrectionPayload;
      const cleanedInput = cleanString(typedAnswer);
      if (cleanedInput === cleanString(p.correct_sentence)) correct = true;
    } else if (currentItem.type === 'compound_word_decomposition') {
      correct = true; // Compound decomposition acts as a study/exploration card with correct checking
    }

    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      setScore((s) => s + (attempts === 0 ? 3 : 1));
    }

    if (currentItem.srs_item_id) {
      let rating: SrsRating = 'good';
      if (!correct) rating = 'again';
      else if (attempts > 0) rating = 'hard';
      else if (correct && attempts === 0) rating = 'easy';

      try {
        await submitReview.mutateAsync({
          itemId: currentItem.srs_item_id,
          itemType: 'vocab',
          rating,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const playAudio = (url?: string | null) => {
    if (!url) return;
    const a = new Audio(url);
    a.play().catch((e) => console.log('Audio play failed', e));
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center space-y-6 animate-pulse">
        <div className="h-16 w-16 rounded-full bg-secondary/30" />
        <p className="font-tajawal text-muted-foreground">جاري تحضير الجلسة الذكية...</p>
      </div>
    );
  }

  if (isError || !session || items.length === 0) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center space-y-5 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
          <X className="h-8 w-8" />
        </div>
        <p className="font-tajawal text-foreground">تعذر بناء الجلسة.</p>
        <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-bold font-tajawal hover:bg-secondary/80">
          العودة
        </button>
      </div>
    );
  }

  if (sessionCompleted) {
    return (
      <div className="flex h-full min-h-dvh flex-col items-center justify-center space-y-8 px-6 bg-background relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[hsl(var(--live))]/10 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 w-full max-w-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] border border-[hsl(var(--live))]/20 shadow-lg">
            <Award className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h2 className="font-amiri text-3xl font-bold text-foreground">جلسة ممتازة!</h2>
            <p className="font-tajawal text-muted-foreground">أتممت التدريبات وراجعت الكلمات بنجاح.</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-1">
              <span className="block font-tajawal text-micro text-muted-foreground uppercase tracking-wider">الإجابات الصحيحة</span>
              <span className="block font-plex-mono text-2xl font-bold text-foreground">{score}</span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-1">
              <span className="block font-tajawal text-micro text-muted-foreground uppercase tracking-wider">المفردات المراجعة</span>
              <span className="block font-plex-mono text-2xl font-bold text-[hsl(var(--live))]">{items.length}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full py-4 bg-[hsl(var(--live))] hover:bg-[hsl(var(--live))]/90 text-white rounded-xl font-tajawal text-sm font-bold shadow-md transition-transform active:scale-95"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentIndex / items.length) * 100);

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      {/* Session Progress Header */}
      <div className="app-header-chrome">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>

          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--live))] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5 font-plex-mono text-xs font-bold text-muted-foreground min-w-[3rem] justify-end">
            <span className="text-foreground">{currentIndex + 1}</span>
            <span className="opacity-50">/</span>
            <span className="opacity-50">{items.length}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 space-y-8">

        {/* Context and Prompt */}
        <div className="space-y-6 text-center">
          {currentItem?.vocab_item && (
            <div className="flex justify-center mb-2">
              <GermanGenderBadge gender={currentItem.vocab_item.gender} />
            </div>
          )}

          {currentItem?.type === 'mcq' && (
            <h2 className="font-tajawal text-xl md:text-2xl font-bold text-foreground leading-relaxed px-4">
              {(currentItem.payload as McqPayload).prompt_de}
            </h2>
          )}

          {currentItem?.type === 'type_answer' && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 border border-border/40">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--live))]" />
                <span className="font-tajawal text-micro text-muted-foreground uppercase tracking-widest">ترجمة حرة</span>
              </div>
              <h2 className="font-tajawal text-xl font-bold text-foreground">
                {(currentItem.payload as TypeAnswerPayload).prompt}
              </h2>
            </div>
          )}

          {currentItem?.type === 'listen_choose' && (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => playAudio((currentItem.payload as ListenChoosePayload).audio_url)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--live))]/10 hover:bg-[hsl(var(--live))]/20 text-[hsl(var(--live))] border border-[hsl(var(--live))]/20 shadow-sm transition-transform active:scale-90"
              >
                <Volume2 className="h-7 w-7" />
              </button>
              <p className="font-tajawal text-xs text-muted-foreground tracking-wide">اضغط للاستماع للنطق</p>
            </div>
          )}

          {currentItem?.type === 'matching_pairs' && (
            <h3 className="font-tajawal text-lg font-bold text-foreground">
              اربط الكلمات الألمانية بمعانيها
            </h3>
          )}

          {currentItem?.type === 'sentence_build' && (
            <div className="space-y-2">
              <h3 className="font-tajawal text-lg font-bold text-foreground">رتب الكلمات لتكوين جملة صحيحة</h3>
              <p className="font-tajawal text-xs text-muted-foreground">اضغط على الكلمات بالترتيب المناسب</p>
            </div>
          )}

          {currentItem?.type === 'fill_blank_grammar' && (
            <div className="space-y-4">
              <h3 className="font-tajawal text-lg font-bold text-foreground">املاً الفراغ بالقاعدة الصحيحة</h3>
              <div className="p-6 rounded-2xl bg-secondary/20 border border-border/40 font-plex-mono text-xl text-center tracking-wide" dir="ltr">
                {(currentItem.payload as FillBlankGrammarPayload).sentence_template}
              </div>
            </div>
          )}

          {currentItem?.type === 'error_correction' && (
            <div className="space-y-4">
              <h3 className="font-tajawal text-lg font-bold text-foreground">صحح الخطأ النحوي أو الإملائي في الجملة</h3>
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-600 font-plex-mono text-base text-center" dir="ltr">
                {(currentItem.payload as ErrorCorrectionPayload).incorrect_sentence}
              </div>
            </div>
          )}

          {currentItem?.type === 'compound_word_decomposition' && (
            <div className="space-y-4">
              <h3 className="font-tajawal text-lg font-bold text-foreground">تفكيك وتحليل الكلمات المركبة (Komposita)</h3>
              <div className="p-6 rounded-2xl bg-[hsl(var(--live))]/5 border border-[hsl(var(--live))]/20 text-[hsl(var(--live))] font-plex-mono text-3xl font-bold tracking-widest text-center" dir="ltr">
                {(currentItem.payload as CompoundWordDecompositionPayload).compound_word}
              </div>
            </div>
          )}
        </div>

        {/* Input & Options */}
        <div className="space-y-3 pt-4">

          {/* MCQ / Listen Choose / Fill Blank Grammar */}
          {(currentItem?.type === 'mcq' || currentItem?.type === 'listen_choose' || currentItem?.type === 'fill_blank_grammar') && (
            <div className="grid grid-cols-1 gap-3">
              {(
                (currentItem.payload as McqPayload).options ||
                (currentItem.payload as ListenChoosePayload).options ||
                (currentItem.payload as FillBlankGrammarPayload).options?.map(opt => ({ id: opt, text: opt })) || []
              ).map((option) => {
                const isSelected = selectedOptionId === option.id;
                let btnClass = 'border-border/40 bg-card hover:bg-secondary/40 text-foreground';

                if (isSelected && !isAnswerChecked) {
                  btnClass = 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/5 text-foreground';
                }

                if (isAnswerChecked) {
                  const isOptCorrect =
                    currentItem.type === 'mcq'
                      ? (option as any).is_correct
                      : currentItem.type === 'fill_blank_grammar'
                      ? option.id === (currentItem.payload as FillBlankGrammarPayload).correct_answer
                      : option.id === (currentItem.payload as ListenChoosePayload).correct_option_id;

                  if (isOptCorrect) {
                    btnClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold';
                  } else if (isSelected) {
                    btnClass = 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 opacity-80';
                  } else {
                    btnClass = 'border-border/20 bg-card opacity-50';
                  }
                }

                return (
                  <button
                    key={option.id}
                    disabled={isAnswerChecked}
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`w-full p-4.5 text-end rounded-2xl border text-sm font-tajawal transition-all flex items-center justify-between shadow-sm ${btnClass}`}
                    dir="ltr"
                  >
                    <span className="text-base">{option.text}</span>
                    {isSelected && !isAnswerChecked && <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--live))]" />}
                    {isAnswerChecked && btnClass.includes('emerald') && <Check className="h-5 w-5 text-emerald-500" />}
                    {isAnswerChecked && btnClass.includes('rose') && <X className="h-5 w-5 text-rose-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Type Answer / Error Correction */}
          {(currentItem?.type === 'type_answer' || currentItem?.type === 'error_correction') && (
            <div className="space-y-3">
              <input
                type="text"
                disabled={isAnswerChecked}
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="اكتب الإجابة الصحيحة بالكامل هنا..."
                className={`w-full p-4.5 rounded-2xl border bg-card focus:outline-none focus:ring-2 focus:ring-[hsl(var(--live))]/50 font-plex-mono text-base tracking-wide text-center transition-all ${
                  isAnswerChecked
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                      : 'border-rose-500 bg-rose-500/10 text-rose-600'
                    : 'border-border/50 text-foreground'
                }`}
                dir="ltr"
              />
              {currentItem.type === 'type_answer' && (currentItem.payload as TypeAnswerPayload).hint && !isAnswerChecked && (
                <p className="text-center text-micro text-muted-foreground font-tajawal bg-secondary/30 py-2 rounded-lg border border-border/20">
                  💡 تلميحة: {(currentItem.payload as TypeAnswerPayload).hint}
                </p>
              )}
            </div>
          )}

          {/* Sentence Build */}
          {currentItem?.type === 'sentence_build' && (
            <div className="space-y-6">
              {/* Construction Board */}
              <div className="min-h-[80px] p-4 rounded-2xl border-2 border-dashed border-border/60 bg-secondary/10 flex flex-wrap gap-2 items-center justify-center">
                {builtTokens.length === 0 ? (
                  <span className="font-tajawal text-xs text-muted-foreground">اضغط على الكلمات بالأسفل للترتيب...</span>
                ) : (
                  builtTokens.map((token, index) => (
                    <button
                      key={index}
                      disabled={isAnswerChecked}
                      onClick={() => {
                        setBuiltTokens((prev) => prev.filter((_, i) => i !== index));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[hsl(var(--live))]/10 border border-[hsl(var(--live))]/20 text-[hsl(var(--live))] font-plex-mono text-sm transition-transform active:scale-95"
                    >
                      {token}
                    </button>
                  ))
                )}
              </div>

              {/* Shuffled pool */}
              <div className="flex flex-wrap gap-2 justify-center">
                {(currentItem.payload as SentenceBuildPayload).shuffled_tokens.map((token) => {
                  const usedCount = builtTokens.filter((t) => t === token).length;
                  const totalInSrs = (currentItem.payload as SentenceBuildPayload).shuffled_tokens.filter((t) => t === token).length;
                  const isUsed = usedCount >= totalInSrs;

                  return (
                    <button
                      key={token + Math.random()}
                      disabled={isUsed || isAnswerChecked}
                      onClick={() => setBuiltTokens((prev) => [...prev, token])}
                      className={`px-4 py-2 rounded-xl border font-plex-mono text-sm transition-all ${
                        isUsed
                          ? 'bg-secondary/20 border-border/10 text-muted-foreground/35 cursor-not-allowed'
                          : 'bg-card border-border/40 hover:bg-secondary/40 text-foreground active:scale-95 shadow-sm'
                      }`}
                    >
                      {token}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compound Word Decomposition */}
          {currentItem?.type === 'compound_word_decomposition' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                {(currentItem.payload as CompoundWordDecompositionPayload).parts.map((part, index) => (
                  <div key={index} className="p-4 rounded-xl border border-border/40 bg-card space-y-1 text-center">
                    <span className="block font-plex-mono text-lg font-bold text-foreground" dir="ltr">{part.part}</span>
                    <span className="block font-tajawal text-xs text-muted-foreground">{part.meaning_ar}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl border border-[hsl(var(--live))]/20 bg-[hsl(var(--live))]/[0.02] text-center mt-2">
                <span className="block font-tajawal text-xs text-muted-foreground">المعنى العام المدمج</span>
                <span className="block font-tajawal text-base font-bold text-[hsl(var(--live))]">
                  {(currentItem.payload as CompoundWordDecompositionPayload).combined_meaning_ar}
                </span>
              </div>
            </div>
          )}

          {/* Matching Pairs */}
          {currentItem?.type === 'matching_pairs' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <span className="block text-center text-micro font-plex-mono tracking-widest text-muted-foreground uppercase opacity-80">Deutsch</span>
                {(currentItem.payload as MatchingPairsPayload).pairs.map((pair) => {
                  const isMatched = Array.from(matchedPairs).some((p) => p.startsWith(pair.left));
                  const isSelected = matchingSelectedLeft === pair.left;
                  return (
                    <button
                      key={pair.left}
                      disabled={isMatched || isAnswerChecked}
                      onClick={() => handlePairClick('left', pair.left)}
                      className={`w-full p-3.5 text-center rounded-xl border text-sm font-plex-mono transition-all ${
                        isMatched
                          ? 'bg-secondary/20 border-border/20 text-muted-foreground/50 line-through'
                          : isSelected
                          ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] font-bold shadow-sm'
                          : 'border-border/40 bg-card hover:bg-secondary/40 text-foreground'
                      }`}
                      dir="ltr"
                    >
                      {pair.left}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                <span className="block text-center text-micro font-plex-mono tracking-widest text-muted-foreground uppercase opacity-80">العربية</span>
                {/* Simplified shuffle visually, real app would randomize this array */}
                {([...(currentItem.payload as MatchingPairsPayload).pairs]).reverse().map((pair) => {
                  const isMatched = Array.from(matchedPairs).some((p) => p.endsWith(pair.right));
                  const isSelected = matchingSelectedRight === pair.right;
                  return (
                    <button
                      key={pair.right}
                      disabled={isMatched || isAnswerChecked}
                      onClick={() => handlePairClick('right', pair.right)}
                      className={`w-full p-3.5 text-center rounded-xl border text-sm font-tajawal transition-all ${
                        isMatched
                          ? 'bg-secondary/20 border-border/20 text-muted-foreground/50 line-through'
                          : isSelected
                          ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] font-bold shadow-sm'
                          : 'border-border/40 bg-card hover:bg-secondary/40 text-foreground'
                      }`}
                    >
                      {pair.right}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Answer Verification Banner & Action Bottom Area */}
      <div className="mt-auto px-4 pt-6 pb-2 space-y-4 max-w-lg w-full mx-auto">

        {isAnswerChecked && (
          <div className={`p-4 rounded-2xl border flex items-start gap-4 animate-in slide-in-from-bottom-2 ${
            isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
          }`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCorrect ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>
              {isCorrect ? <Check className="h-4.5 w-4.5" /> : <X className="h-4.5 w-4.5" />}
            </div>
            <div className="space-y-1.5 text-end flex-1 pt-1">
              <h4 className={`font-tajawal text-sm font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
              </h4>

              {!isCorrect && currentItem?.type === 'type_answer' && (
                <p className="font-plex-mono text-xs text-muted-foreground mt-1" dir="ltr">
                  الإجابة المعتمدة: {(currentItem.payload as TypeAnswerPayload).accepted_answers[0]}
                </p>
              )}

              {!isCorrect && currentItem?.type === 'sentence_build' && (
                <p className="font-plex-mono text-xs text-muted-foreground mt-1" dir="ltr">
                  الترتيب الصحيح: {(currentItem.payload as SentenceBuildPayload).correct_sentence}
                </p>
              )}

              {!isCorrect && currentItem?.type === 'fill_blank_grammar' && (
                <p className="font-plex-mono text-xs text-muted-foreground mt-1" dir="ltr">
                  الإجابة الصحيحة: {(currentItem.payload as FillBlankGrammarPayload).correct_answer}
                </p>
              )}

              {!isCorrect && currentItem?.type === 'error_correction' && (
                <div className="space-y-1">
                  <p className="font-plex-mono text-xs text-emerald-600 mt-1" dir="ltr">
                    الصواب: {(currentItem.payload as ErrorCorrectionPayload).correct_sentence}
                  </p>
                  <p className="font-tajawal text-xs text-muted-foreground">
                    الشرح: {(currentItem.payload as ErrorCorrectionPayload).explanation_ar}
                  </p>
                </div>
              )}

              {currentItem?.vocab_item && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="font-plex-mono text-xs font-bold text-foreground" dir="ltr">{currentItem.vocab_item.lemma_de}</p>
                  <p className="font-tajawal text-xs text-muted-foreground">{currentItem.vocab_item.translation_ar}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentItem?.vocab_item?.lemma_de === 'Name' && isAnswerChecked && (
          <PedagogicalBridge
            title="الأسماء الكبيرة"
            explanationAr="الأسماء في الألمانية تُكتب دائماً بحرف كبير (Capitalized)."
            contrastiveNoteAr="الألمانية تطابق النحو العربي في استخدام أدوات التعريف وتقسيم الكلمات لمذكر ومؤنث."
          />
        )}

        {!isAnswerChecked ? (
          <button
            onClick={handleCheckAnswer}
            disabled={
              ((currentItem?.type === 'mcq' || currentItem?.type === 'listen_choose' || currentItem?.type === 'fill_blank_grammar') && !selectedOptionId) ||
              (currentItem?.type === 'sentence_build' && builtTokens.length === 0) ||
              ((currentItem?.type === 'type_answer' || currentItem?.type === 'error_correction') && !typedAnswer.trim())
            }
            className="w-full py-4 bg-[hsl(var(--live))] hover:bg-[hsl(var(--live))]/90 disabled:opacity-50 disabled:hover:bg-[hsl(var(--live))] text-white rounded-2xl font-tajawal text-sm font-bold shadow-lg shadow-[hsl(var(--live))]/20 transition-all active:scale-95"
          >
            تحقق
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`w-full py-4 text-white rounded-2xl font-tajawal text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isCorrect ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
            }`}
          >
            <span>استمر</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>

    </div>
  );
};
export default ExerciseSession;
