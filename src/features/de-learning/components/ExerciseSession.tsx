import React, { useState, useEffect, useMemo } from 'react';
import { useBuildSession, useSubmitSrsReview, useUpdateStats } from '../hooks';
import { SessionItem, SrsRating, McqPayload, TypeAnswerPayload, ListenChoosePayload, MatchingPairsPayload } from '../types';
import { GermanGenderBadge } from './GermanGenderBadge';
import { PedagogicalBridge } from './PedagogicalBridge';
import { ArrowLeft, ArrowRight, Check, X, Volume2, Sparkles, Award } from '@/lib/icons';
import { toast } from 'sonner';

interface ExerciseSessionProps {
  minutes?: number;
  onClose: () => void;
}

export const ExerciseSession: React.FC<ExerciseSessionProps> = ({
  minutes = 5,
  onClose,
}) => {
  const { data: session, isLoading, isError } = useBuildSession(minutes);
  const submitReview = useSubmitSrsReview();
  const updateStats = useUpdateStats();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setIsAttempts] = useState(0);

  // Matching pairs matching state
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [matchingSelectedRight, setMatchingSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set()); // Contains left+right composite strings

  // Final summary statistics
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const items = useMemo(() => session?.items || [], [session]);
  const currentItem: SessionItem | undefined = items[currentIndex];

  useEffect(() => {
    // Reset state per question
    setSelectedOptionId(null);
    setTypedAnswer('');
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setIsAttempts(0);
    setMatchingSelectedLeft(null);
    setMatchingSelectedRight(null);
    setMatchedPairs(new Set());
  }, [currentIndex, items]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
        <p className="font-tajawal text-sm text-muted-foreground">جاري تحضير جلستك التعليمية التفاعلية...</p>
      </div>
    );
  }

  if (isError || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4" dir="rtl">
        <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full">
          <X className="h-6 w-6" />
        </div>
        <h3 className="font-tajawal text-base font-bold">عذراً، لم نتمكن من تحضير الجلسة</h3>
        <p className="font-tajawal text-xs text-muted-foreground max-w-sm">
          تأكد من اتصالك بالشبكة أو كرر المحاولة لاحقاً.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-tajawal text-xs font-semibold"
        >
          العودة للمكتبة
        </button>
      </div>
    );
  }

  // Play audio helper
  const playAudio = (url: string | null) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch((e) => console.log('Audio playback blocked/failed:', e));
  };

  const handleCheckAnswer = () => {
    if (!currentItem) return;
    setIsAnswerChecked(true);

    let correct = false;

    if (currentItem.type === 'mcq') {
      const payload = currentItem.payload as McqPayload;
      const selectedOption = payload.options.find((o) => o.id === selectedOptionId);
      correct = selectedOption?.is_correct || false;
    } else if (currentItem.type === 'type_answer') {
      const payload = currentItem.payload as TypeAnswerPayload;
      const cleanInput = typedAnswer.trim().toLowerCase();
      correct = payload.accepted_answers.some((ans) => ans.toLowerCase() === cleanInput);
    } else if (currentItem.type === 'listen_choose') {
      const payload = currentItem.payload as ListenChoosePayload;
      correct = selectedOptionId === payload.correct_option_id;
    } else if (currentItem.type === 'matching_pairs') {
      const payload = currentItem.payload as MatchingPairsPayload;
      correct = matchedPairs.size === payload.pairs.length;
    }

    setIsCorrect(correct);

    // Dynamic SRS rating mapping (§4)
    // First attempt success -> 'good' or 'easy' (based on attempts), failure -> 'again'
    const rating: SrsRating = correct ? (attempts === 0 ? 'good' : 'hard') : 'again';

    if (currentItem.srs_item_id) {
      submitReview.mutate({
        itemId: currentItem.srs_item_id,
        itemType: 'vocab',
        rating,
      });
    } else if (currentItem.vocab_item?.id) {
      // If it's a new word, initialize its SRS state in our database
      submitReview.mutate({
        itemId: currentItem.vocab_item.id,
        itemType: 'vocab',
        rating,
      });
    }

    if (correct) {
      setScore((prev) => prev + 1);
      toast.success('إجابة صحيحة! أحسنت العمل.', { duration: 2000 });
    } else {
      setIsAttempts((prev) => prev + 1);
      toast.error('إجابة خاطئة. حاول مجدداً لفهم الكلمة.', { duration: 2500 });
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Session finished
      updateStats.mutate(25); // Award +25 XP
      setSessionCompleted(true);
    }
  };

  // Matching pairs handle selections
  const handlePairClick = (side: 'left' | 'right', value: string) => {
    if (isAnswerChecked) return;

    if (side === 'left') {
      setMatchingSelectedLeft(value);
      if (matchingSelectedRight) {
        verifyPair(value, matchingSelectedRight);
      }
    } else {
      setMatchingSelectedRight(value);
      if (matchingSelectedLeft) {
        verifyPair(matchingSelectedLeft, value);
      }
    }
  };

  const verifyPair = (left: string, right: string) => {
    const payload = currentItem?.payload as MatchingPairsPayload;
    const match = payload.pairs.find((p) => p.left === left && p.right === right);

    if (match) {
      setMatchedPairs((prev) => {
        const next = new Set(prev);
        next.add(`${left}||${right}`);
        return next;
      });
      toast.success('تطابق صحيح!', { duration: 1000 });
    } else {
      toast.error('خطأ، حاول مرة أخرى.', { duration: 1000 });
    }

    setMatchingSelectedLeft(null);
    setMatchingSelectedRight(null);
  };

  if (sessionCompleted) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6 text-center" dir="rtl">
        <div className="relative inline-flex p-4 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full animate-bounce">
          <Award className="h-12 w-12" />
          <Sparkles className="absolute top-0 right-0 h-5 w-5 text-amber-500 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="font-amiri text-2xl font-bold text-foreground">تهانينا! اكتملت الجلسة بنجاح</h2>
          <p className="font-tajawal text-xs text-muted-foreground">
            لقد أنهيت الجلسة التدريبية المخصصة ورسخت الكلمات في ذاكرتك الطويلة.
          </p>
        </div>

        {/* Stats Summary Panel */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/40 border border-border/40">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">النقاط المكتسبة</span>
            <p className="font-mono text-title font-extrabold text-teal-600 dark:text-teal-400">+25 XP</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">النتيجة الإجمالية</span>
            <p className="font-mono text-title font-extrabold text-foreground">{score} / {items.length}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-tajawal text-sm font-bold shadow-md shadow-teal-500/10 transition-transform active:scale-95"
        >
          إنهاء والعودة للخريطة
        </button>
      </div>
    );
  }

  const progressPercent = ((currentIndex) / items.length) * 100;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6" dir="rtl">
      {/* Top Header Progress */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Custom Progress Bar */}
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="font-mono text-xs text-muted-foreground font-semibold" dir="ltr">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Main Question Card */}
      <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-5">
        {/* Concept Metadata Indicator */}
        <div className="flex justify-between items-start">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-tajawal font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
            {currentItem.type === 'mcq' && 'خيار من متعدد'}
            {currentItem.type === 'type_answer' && 'ترجمة وكتابة'}
            {currentItem.type === 'listen_choose' && 'استماع واختيار'}
            {currentItem.type === 'matching_pairs' && 'توصيل أزواج'}
          </span>

          {currentItem.vocab_item?.gender && (
            <GermanGenderBadge gender={currentItem.vocab_item.gender} showLabel={true} />
          )}
        </div>

        {/* Prompt Section */}
        <div className="space-y-2 text-center">
          {currentItem.type === 'mcq' && (
            <h3 className="font-tajawal text-base font-bold text-foreground" dir="ltr">
              {(currentItem.payload as McqPayload).prompt_de || 'اختر الإجابة الصحيحة:'}
            </h3>
          )}

          {currentItem.type === 'type_answer' && (
            <div className="space-y-1">
              <h3 className="font-tajawal text-base font-bold text-foreground" dir="rtl">
                {(currentItem.payload as TypeAnswerPayload).prompt}
              </h3>
              {isAnswerChecked && (
                <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                  الإجابات المقبولة: {(currentItem.payload as TypeAnswerPayload).accepted_answers.join(' / ')}
                </p>
              )}
            </div>
          )}

          {currentItem.type === 'listen_choose' && (
            <div className="flex flex-col items-center space-y-3">
              <button
                onClick={() => playAudio((currentItem.payload as ListenChoosePayload).audio_url)}
                className="flex items-center justify-center h-14 w-14 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 shadow transition-transform active:scale-90"
              >
                <Volume2 className="h-6 w-6" />
              </button>
              <p className="font-tajawal text-xs text-muted-foreground">اضغط للاستماع للنطق الألماني</p>
            </div>
          )}

          {currentItem.type === 'matching_pairs' && (
            <h3 className="font-tajawal text-sm font-bold text-foreground">
              قم بتوصيل الكلمات الألمانية بمعانيها العربية المقابلة:
            </h3>
          )}
        </div>

        {/* Interactive Answer Input / Options */}
        <div className="space-y-3 pt-2">
          {/* MCQ / Listen Choose Layout */}
          {(currentItem.type === 'mcq' || currentItem.type === 'listen_choose') && (
            <div className="grid grid-cols-1 gap-2.5">
              {((currentItem.payload as McqPayload).options || (currentItem.payload as ListenChoosePayload).options).map((option) => {
                const isSelected = selectedOptionId === option.id;
                let btnBorder = 'border-border/40';
                let btnBg = 'hover:bg-secondary/40';

                if (isSelected) {
                  btnBorder = 'border-teal-500';
                  btnBg = 'bg-teal-500/5';
                }

                if (isAnswerChecked) {
                  const isOptCorrect =
                    currentItem.type === 'mcq'
                      ? (option as any).is_correct
                      : option.id === (currentItem.payload as ListenChoosePayload).correct_option_id;

                  if (isOptCorrect) {
                    btnBorder = 'border-emerald-500';
                    btnBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                  } else if (isSelected) {
                    btnBorder = 'border-rose-500';
                    btnBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
                  }
                }

                return (
                  <button
                    key={option.id}
                    disabled={isAnswerChecked}
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`w-full p-4 text-right rounded-xl border text-sm font-tajawal font-medium leading-relaxed transition-all flex items-center justify-between ${btnBorder} ${btnBg}`}
                    dir="ltr"
                  >
                    <span>{option.text}</span>
                    {isSelected && !isAnswerChecked && <div className="h-2 w-2 rounded-full bg-teal-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Type Answer Layout */}
          {currentItem.type === 'type_answer' && (
            <div className="space-y-2">
              <input
                type="text"
                disabled={isAnswerChecked}
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="اكتب الإجابة بالألمانية هنا..."
                className="w-full p-4 rounded-xl border border-border/40 bg-secondary/10 focus:outline-none focus:border-teal-500 font-mono text-sm tracking-wide text-center"
                dir="ltr"
              />
              {(currentItem.payload as TypeAnswerPayload).hint && (
                <p className="text-right text-[10px] text-muted-foreground font-tajawal">
                  تلميحة: {(currentItem.payload as TypeAnswerPayload).hint}
                </p>
              )}
            </div>
          )}

          {/* Matching Pairs Layout */}
          {currentItem.type === 'matching_pairs' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column (German) */}
              <div className="space-y-2">
                <span className="block text-center text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Deutsch</span>
                {(currentItem.payload as MatchingPairsPayload).pairs.map((pair) => {
                  const isMatched = Array.from(matchedPairs).some((p) => p.startsWith(pair.left));
                  const isSelected = matchingSelectedLeft === pair.left;

                  return (
                    <button
                      key={pair.left}
                      disabled={isMatched || isAnswerChecked}
                      onClick={() => handlePairClick('left', pair.left)}
                      className={`w-full p-3 text-center rounded-xl border text-xs font-mono transition-all ${
                        isMatched
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 opacity-60 line-through'
                          : isSelected
                          ? 'border-teal-500 bg-teal-500/5 text-teal-600 dark:text-teal-400 font-bold'
                          : 'border-border/40 bg-card hover:bg-secondary/40'
                      }`}
                      dir="ltr"
                    >
                      {pair.left}
                    </button>
                  );
                })}
              </div>

              {/* Right Column (Arabic) */}
              <div className="space-y-2">
                <span className="block text-center text-[10px] font-mono tracking-widest text-muted-foreground uppercase">العربية</span>
                {/* Shuffle right-side to make matching interesting */}
                {([...(currentItem.payload as MatchingPairsPayload).pairs]).map((pair) => {
                  const isMatched = Array.from(matchedPairs).some((p) => p.endsWith(pair.right));
                  const isSelected = matchingSelectedRight === pair.right;

                  return (
                    <button
                      key={pair.right}
                      disabled={isMatched || isAnswerChecked}
                      onClick={() => handlePairClick('right', pair.right)}
                      className={`w-full p-3 text-center rounded-xl border text-xs font-tajawal transition-all ${
                        isMatched
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 opacity-60 line-through'
                          : isSelected
                          ? 'border-teal-500 bg-teal-500/5 text-teal-600 dark:text-teal-400 font-bold'
                          : 'border-border/40 bg-card hover:bg-secondary/40'
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

      {/* Answer Verification Banner & Action Button */}
      <div className="space-y-4">
        {isAnswerChecked && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
              isCorrect
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400'
            }`}
          >
            <div className={`p-1 rounded-full ${isCorrect ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </div>
            <div className="flex-1 space-y-1 text-right">
              <h4 className="font-tajawal text-xs font-bold">
                {isCorrect ? 'إجابة ممتازة وصحيحة!' : 'لم تكن هذه صحيحة تماماً.'}
              </h4>
              {currentItem.vocab_item && (
                <div className="pt-1">
                  <p className="font-mono text-sm font-bold" dir="ltr">{currentItem.vocab_item.lemma_de}</p>
                  <p className="font-tajawal text-xs opacity-95">{currentItem.vocab_item.translation_ar}</p>
                  {currentItem.vocab_item.example_sentence_de && (
                    <p className="font-mono text-[11px] opacity-75 mt-1" dir="ltr">
                      {currentItem.vocab_item.example_sentence_de}
                    </p>
                  )}
                  {currentItem.vocab_item.example_sentence_ar && (
                    <p className="font-tajawal text-[11px] opacity-75">
                      {currentItem.vocab_item.example_sentence_ar}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pedagogical Bridge Integration if grammar points exist */}
        {currentItem.vocab_item?.lemma_de === 'Name' && (
          <PedagogicalBridge
            title="الاسم المذكر والأدوات"
            explanationAr="الأسماء في الألمانية تكتب دائماً بحرف كبير (Capitalized) ولها أداة تدل على جنسها النحوي."
            contrastiveNoteAr="الألمانية تطابق النحو العربي في استخدام أدوات التعريف وتقسيم الكلمات لمذكر ومؤنث. الأداة der للمذكر تناسب كلمة الاسم تماماً مثل العربية."
          />
        )}

        {/* Submit or Continue Button */}
        {!isAnswerChecked ? (
          <button
            onClick={handleCheckAnswer}
            disabled={
              (currentItem.type === 'mcq' || currentItem.type === 'listen_choose') &&
              !selectedOptionId
            }
            className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-tajawal text-sm font-bold shadow-md shadow-teal-500/10 transition-transform active:scale-95"
          >
            التحقق من الإجابة
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-4 bg-foreground hover:bg-foreground/90 text-background rounded-xl font-tajawal text-sm font-bold shadow transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span>متابعة الجلسة</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
export default ExerciseSession;
