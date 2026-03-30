import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart, Share2, Copy, BookOpen, Plus, Minus } from 'lucide-react';
import { sunnahDetailData } from '@/data/sunnahDetailData';
import { toast } from 'sonner';

export default function SunnahDetail() {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const data = sunnahDetailData[categoryId || ''];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [direction, setDirection] = useState(0);

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">لم يتم العثور على البيانات</p>
      </div>
    );
  }

  const item = data.items[currentIndex];
  const total = data.items.length;

  const goNext = () => {
    if (currentIndex < total - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${item.title}\n\n${item.description}\n\n${item.source}`);
    toast.success('تم النسخ');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: item.title, text: `${item.title}\n\n${item.description}\n\n${item.source}` });
    } else {
      handleCopy();
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir >= 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir >= 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-10" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">{data.label}</h1>
            <p className="text-xs text-muted-foreground">{total} / {currentIndex + 1}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full bg-muted/30">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%`, backgroundColor: data.accent }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg rounded-2xl bg-card border border-border/40 overflow-hidden"
          >
            {/* Green top accent */}
            <div className="h-1.5" style={{ backgroundColor: data.accent }} />

            {/* Title */}
            <div className="px-6 pt-6 pb-3">
              <h2 className="text-xl font-bold text-foreground text-center leading-relaxed" style={{ fontSize: fontSize + 2 }}>
                {item.title}
              </h2>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 pb-3">
              <button onClick={handleCopy} className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={handleShare} className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center">
                <Heart className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Dot indicator */}
            <div className="flex justify-center py-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.accent }} />
            </div>

            {/* Separator */}
            <div className="mx-6 border-t border-border/30" />

            {/* Description */}
            <div className="px-6 py-5">
              <p className="text-foreground text-center leading-[1.9]" style={{ fontSize }}>
                {item.description}
              </p>
            </div>

            {/* Source */}
            <div className="mx-6 mb-4">
              <div className="flex items-center justify-end gap-2 px-4 py-3 rounded-xl" style={{ backgroundColor: `${data.accent}15` }}>
                <span className="text-sm font-semibold" style={{ color: data.accent }}>{item.source}</span>
                <BookOpen className="w-4 h-4" style={{ color: data.accent }} />
              </div>
            </div>

            {/* Bottom controls */}
            <div className="mx-6 mb-5 border-t border-border/30 pt-4">
              <div className="flex items-center justify-between">
                {/* Prev */}
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="w-11 h-11 rounded-xl bg-muted/40 flex items-center justify-center disabled:opacity-20"
                  style={currentIndex > 0 ? { backgroundColor: `${data.accent}25`, color: data.accent } : {}}
                >
                  <ChevronLeft className="w-5 h-5" style={currentIndex > 0 ? { color: data.accent } : {}} />
                </button>

                {/* Font size */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFontSize(s => Math.max(14, s - 2))}
                    className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground font-bold text-sm"
                  >
                    أ-
                  </button>
                  <button
                    onClick={() => setFontSize(s => Math.min(28, s + 2))}
                    className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground font-bold text-sm"
                  >
                    +أ
                  </button>
                </div>

                {/* Next */}
                <button
                  onClick={goNext}
                  disabled={currentIndex === total - 1}
                  className="w-11 h-11 rounded-xl bg-muted/40 flex items-center justify-center disabled:opacity-20"
                  style={currentIndex < total - 1 ? { backgroundColor: `${data.accent}25`, color: data.accent } : {}}
                >
                  <ChevronRight className="w-5 h-5" style={currentIndex < total - 1 ? { color: data.accent } : {}} />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
