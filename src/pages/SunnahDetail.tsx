import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart, Share2, Copy, BookOpen } from 'lucide-react';
import { sunnahDetailData, SunnahDetailItem } from '@/data/sunnahDetailData';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

function DetailedView({ data }: { data: { label: string; accent: string; items: SunnahDetailItem[] } }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();
  const { dir } = useApp();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const ForwardIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const item = data.items[currentIndex];
  const total = data.items.length;

  const goNext = () => { if (currentIndex < total - 1) { setDirection(1); setCurrentIndex(i => i + 1); } };
  const goPrev = () => { if (currentIndex > 0) { setDirection(-1); setCurrentIndex(i => i - 1); } };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${item.title}\n\n${item.description}\n\n${item.source}`);
    toast.success('تم النسخ');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: item.title, text: `${item.title}\n\n${item.description}\n\n${item.source}` });
    } else { handleCopy(); }
  };

  const variants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-10" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">{data.label}</h1>
            <p className="text-xs text-muted-foreground">{total} / {currentIndex + 1}</p>
          </div>
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <div className="h-1 w-full bg-muted/30">
          <div className="h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / total) * 100}%`, backgroundColor: data.accent }} />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={currentIndex} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.08 }} className="w-full max-w-lg rounded-2xl bg-card border border-border/40 overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: data.accent }} />
            <div className="px-6 pt-6 pb-3">
              <h2 className="text-xl font-bold text-foreground text-center leading-relaxed" style={{ fontSize: fontSize + 2 }}>{item.title}</h2>
            </div>
            <div className="flex items-center justify-center gap-3 pb-3">
              <button onClick={handleCopy} className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center"><Copy className="w-4 h-4 text-muted-foreground" /></button>
              <button onClick={handleShare} className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center"><Share2 className="w-4 h-4 text-muted-foreground" /></button>
              <button className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center"><Heart className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex justify-center py-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.accent }} /></div>
            <div className="mx-6 border-t border-border/30" />
            <div className="px-6 py-5">
              <p className="text-foreground text-center leading-[1.9]" style={{ fontSize }}>{item.description}</p>
            </div>
            <div className="mx-6 mb-4">
              <div className="flex items-center justify-end gap-2 px-4 py-3 rounded-xl" style={{ backgroundColor: `${data.accent}15` }}>
                <span className="text-sm font-semibold" style={{ color: data.accent }}>{item.source}</span>
                <BookOpen className="w-4 h-4" style={{ color: data.accent }} />
              </div>
            </div>
            <div className="mx-6 mb-5 border-t border-border/30 pt-4">
              <div className="flex items-center justify-between">
                <button onClick={goPrev} disabled={currentIndex === 0} className="w-11 h-11 rounded-xl bg-muted/40 flex items-center justify-center disabled:opacity-20" style={currentIndex > 0 ? { backgroundColor: `${data.accent}25`, color: data.accent } : {}}>
                  <ChevronLeft className="w-5 h-5" style={currentIndex > 0 ? { color: data.accent } : {}} />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground font-bold text-sm">أ-</button>
                  <button onClick={() => setFontSize(s => Math.min(28, s + 2))} className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground font-bold text-sm">+أ</button>
                </div>
                <button onClick={goNext} disabled={currentIndex === total - 1} className="w-11 h-11 rounded-xl bg-muted/40 flex items-center justify-center disabled:opacity-20" style={currentIndex < total - 1 ? { backgroundColor: `${data.accent}25`, color: data.accent } : {}}>
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

function SimpleListView({ data }: { data: { label: string; accent: string; items: { title: string }[] } }) {
  const navigate = useNavigate();

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
  const itemAnim = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } } };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{data.label}</h1>
          <div className="w-10" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-5">
        <div className="text-right">
          <h2 className="text-base font-bold text-foreground">السنن</h2>
          <p className="text-sm text-muted-foreground">{data.items.length} سنة</p>
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${data.accent}18` }}>
          <BookOpen className="w-6 h-6" style={{ color: data.accent }} />
        </div>
      </div>
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-2.5 px-4">
        {data.items.map((sunnah, index) => (
          <motion.div key={index} variants={itemAnim} className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 shrink-0">
              <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />
              <Heart className="w-4 h-4 text-muted-foreground/40" />
            </div>
            <p className="flex-1 text-sm font-medium text-foreground text-right leading-relaxed">{sunnah.title}</p>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${data.accent}20` }}>
              <span className="text-xs font-bold" style={{ color: data.accent }}>{index + 1}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function SunnahDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const data = sunnahDetailData[categoryId || ''];

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">لم يتم العثور على البيانات</p>
      </div>
    );
  }

  if (data.type === 'detailed') {
    return <DetailedView data={{ ...data, items: data.items as SunnahDetailItem[] }} />;
  }

  return <SimpleListView data={{ ...data, items: data.items as { title: string }[] }} />;
}
