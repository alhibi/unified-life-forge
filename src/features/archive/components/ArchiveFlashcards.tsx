import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Smile,
  Sparkles,
  Trophy,
} from '@/lib/icons';

import type { ArchiveOutline } from '../types';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  sectionTitle: string;
}

interface ArchiveFlashcardsProps {
  outline: ArchiveOutline;
  onClose?: () => void;
}

export default function ArchiveFlashcards({ outline, onClose: _onClose }: ArchiveFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [scores, setScores] = useState<Record<string, 'easy' | 'medium' | 'hard'>>({});

  // Parse sections to generate question/answer pairs
  const cards = useMemo<Flashcard[]>(() => {
    const list: Flashcard[] = [];

    // Add synopsis card
    list.push({
      id: 'synopsis',
      sectionTitle: 'الخلاصة المعرفية',
      question: `ما هو المحور الجوهري والملخص الأساسي لموضوع: "${outline.title}"؟`,
      answer: outline.synopsis,
    });

    outline.sections.forEach((sec, _sIdx) => {
      // Create section summary question
      list.push({
        id: `sec-${sec.id}-summary`,
        sectionTitle: sec.title,
        question: `ما هي الأبعاد والمحاور الأساسية التي يناقشها قسم "${sec.title}"؟`,
        answer:
          `يناقش هذا القسم ${sec.title} ويركز بشكل مباشر على:\n\n` +
          sec.subsections.map((sub) => `• ${sub.title}: ${sub.angle}`).join('\n'),
      });

      sec.subsections.forEach((sub, _subIdx) => {
        // Detailed questions based on angles
        list.push({
          id: `sub-${sub.id}`,
          sectionTitle: sec.title,
          question: `في سياق "${sec.title}"، ما هو المنظور والزاوية المعرفية المتعلقة بـ "${sub.title}"؟`,
          answer: `منظور التناول لـ "${sub.title}" يركز على:\n${sub.angle}`,
        });
      });
    });

    return list;
  }, [outline]);

  const activeCard = cards[currentIndex];

  const handleScore = (score: 'easy' | 'medium' | 'hard') => {
    setScores((prev) => ({ ...prev, [activeCard.id]: score }));
    setIsFlipped(false);

    // Move to next card smoothly after brief delay
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 200);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScores({});
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = cards.length;
    const answered = Object.keys(scores).length;
    const easyCount = Object.values(scores).filter((s) => s === 'easy').length;
    const medCount = Object.values(scores).filter((s) => s === 'medium').length;
    const hardCount = Object.values(scores).filter((s) => s === 'hard').length;
    const scorePct = answered > 0 ? Math.round(((easyCount + medCount * 0.5) / total) * 100) : 0;

    return { total, answered, easyCount, medCount, hardCount, scorePct };
  }, [scores, cards]);

  return (
    <div className="space-y-5">
      {/* Header and statistics panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="text-[13px] font-bold">التكرار المتباعد وتثبيت المادة</span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          {currentIndex + 1} / {cards.length} بطاقة
        </span>
      </div>

      {stats.answered === stats.total ? (
        // Completed View
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 px-4"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h4 className="text-[16px] font-bold text-foreground">تمت مراجعة كامل الأرشيف!</h4>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            لقد تفاعلت مع جميع النقاط الهيكلية في المونوغراف. نسبة التمكين المعرفي المقدرة هي:
          </p>

          <div className="my-5 inline-flex items-center justify-center relative">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-muted/20 fill-none"
                strokeWidth="4"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-primary fill-none transition-all duration-1000"
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - stats.scorePct / 100)}
              />
            </svg>
            <span className="absolute text-sm font-bold text-primary font-mono">
              {stats.scorePct}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2">
              <div className="text-[10px] text-muted-foreground">متمكن</div>
              <div className="text-sm font-bold text-emerald-500">{stats.easyCount}</div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2">
              <div className="text-[10px] text-muted-foreground">متوسط</div>
              <div className="text-sm font-bold text-amber-500">{stats.medCount}</div>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-2">
              <div className="text-[10px] text-muted-foreground">صعب</div>
              <div className="text-sm font-bold text-rose-500">{stats.hardCount}</div>
            </div>
          </div>

          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-semibold mx-auto active:scale-95 transition-transform"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المراجعة من جديد</span>
          </button>
        </motion.div>
      ) : (
        // Active Memorization Cards
        <div className="space-y-4">
          <div className="relative h-[220px] md:h-[260px] w-full perspective-[1000px]">
            <motion.div
              className="relative w-full h-full duration-500 preserve-3d cursor-pointer"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front Side */}
              <AppCard
                flat
                className="absolute inset-0 backface-hidden w-full h-full flex flex-col justify-between border-primary/20 bg-primary/[0.01] p-5 shadow-lg select-none"
              >
                <div>
                  <div className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2">
                    {activeCard?.sectionTitle}
                  </div>
                  <p className="text-[14px] md:text-[15px] font-bold text-foreground leading-relaxed">
                    {activeCard?.question}
                  </p>
                </div>
                <div className="text-center text-[11px] text-muted-foreground/60 font-medium">
                  انقر لقلب البطاقة ومعرفة الجواب 💡
                </div>
              </AppCard>

              {/* Back Side */}
              <AppCard
                flat
                style={{ transform: 'rotateY(180deg)' }}
                className="absolute inset-0 backface-hidden w-full h-full flex flex-col justify-between border-primary/25 bg-card p-5 shadow-lg overflow-y-auto"
              >
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                    الإجابة المعرفية النموذجية
                  </div>
                  <p className="text-[13px] text-foreground leading-loose whitespace-pre-wrap">
                    {activeCard?.answer}
                  </p>
                </div>
                <div className="text-center text-[10px] text-primary/70 font-semibold pt-3 border-t border-border/10">
                  انقر مجدداً للعودة للسؤال 🔄
                </div>
              </AppCard>
            </motion.div>
          </div>

          {/* Rating score buttons */}
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-2.5 pt-2"
              >
                <div className="text-center text-[11px] text-muted-foreground">
                  قيم مستوى تمكنك من المعلومة:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleScore('hard')}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[11px] font-bold">صعب / لم أذكر</span>
                  </button>
                  <button
                    onClick={() => handleScore('medium')}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 transition-colors"
                  >
                    <Activity className="w-4 h-4" />
                    <span className="text-[11px] font-bold">متوسط التذكر</span>
                  </button>
                  <button
                    onClick={() => handleScore('easy')}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                  >
                    <Smile className="w-4 h-4" />
                    <span className="text-[11px] font-bold">سهل / تذكرته</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Carousel footer navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={currentIndex === 0}
              onClick={() => {
                setCurrentIndex((p) => p - 1);
                setIsFlipped(false);
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground disabled:opacity-30 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
            <span className="text-[10px] text-muted-foreground font-mono">
              البطاقة {currentIndex + 1} من {cards.length}
            </span>
            <button
              disabled={currentIndex === cards.length - 1}
              onClick={() => {
                setCurrentIndex((p) => p + 1);
                setIsFlipped(false);
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground disabled:opacity-30 active:scale-95 transition-transform"
            >
              <span>التالي</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
