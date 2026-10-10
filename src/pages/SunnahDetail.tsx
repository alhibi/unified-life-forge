import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import { AppCard, AppList, IconButton, IconChip, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { useApp } from '@/contexts/AppContext';
import { sunnahDetailData, SunnahDetailItem } from '@/data/sunnahDetailData';
import { BookOpen, ChevronLeft, ChevronRight, Copy, Heart, Share2 } from '@/lib/icons';
import { DURATION, EASE_OUT_EXPO } from '@/lib/motion';
import { notify } from '@/lib/notify';

function DetailedView({ data }: { data: { label: string; accent: string; items: SunnahDetailItem[] } }) {
  const [searchParams] = useSearchParams();
  const initialIndex = parseInt(searchParams.get('index') || '0', 10);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fontSize, setFontSize] = useState(18);
  const [direction, setDirection] = useState(0);
  const { dir } = useApp();

  const item = data.items[currentIndex];
  const total = data.items.length;

  const goNext = () => { if (currentIndex < total - 1) { setDirection(1); setCurrentIndex(i => i + 1); } };
  const goPrev = () => { if (currentIndex > 0) { setDirection(-1); setCurrentIndex(i => i - 1); } };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${item.title}\n\n${item.description}\n\n${item.source}`);
    notify.copied();
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

  const canGoBack = dir === 'rtl' ? currentIndex < total - 1 : currentIndex > 0;
  const canGoForward = dir === 'rtl' ? currentIndex > 0 : currentIndex < total - 1;

  return (
    <PageShell flush centered={false} className="px-4">
      <div className="mx-auto w-full max-w-lg">
        <PageHeader sticky title={data.label} subtitle={`${currentIndex + 1} / ${total}`} />

        {/* Reading progress — state, not decoration. */}
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted/30">
          <div className="h-full bg-primary transition-motion duration-normal" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>

        <div className="flex items-start justify-center pt-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentIndex} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.08 }} className="w-full">
              <AppCard className="w-full overflow-hidden p-0">
                <div className="h-1.5 bg-primary" />
                <div className="px-6 pt-6 pb-3">
                  <h2 className="text-title font-bold text-foreground text-center leading-relaxed" style={{ fontSize: fontSize + 2 }}>{item.title}</h2>
                </div>
                <div className="flex items-center justify-center gap-3 pb-3">
                  <IconButton onClick={handleCopy} aria-label="نسخ السنة">
                    <Copy className="h-4 w-4" aria-hidden />
                  </IconButton>
                  <IconButton onClick={handleShare} aria-label="مشاركة السنة">
                    <Share2 className="h-4 w-4" aria-hidden />
                  </IconButton>
                  <IconButton aria-label="إضافة إلى المفضلة">
                    <Heart className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
                <div className="flex justify-center py-2"><div className="w-2 h-2 rounded-full bg-primary" /></div>
                <div className="mx-6 border-t border-border/30" />
                <div className="px-6 py-5">
                  <p className="text-foreground text-center leading-[1.9]" style={{ fontSize }}>{item.description}</p>
                </div>
                <div className="mx-6 mb-4">
                  <div className="flex items-center justify-end gap-2 px-4 py-3 rounded-xl bg-primary/10">
                    <span className="text-meta font-semibold text-primary">{item.source}</span>
                    <BookOpen className="w-4 h-4 text-primary" aria-hidden />
                  </div>
                </div>
                <div className="mx-6 mb-5 border-t border-border/30 pt-4">
                  <div className="flex items-center justify-between">
                    <IconButton
                      onClick={dir === 'rtl' ? goNext : goPrev}
                      disabled={!canGoBack}
                      aria-label="السنة السابقة"
                      className="disabled:opacity-40"
                    >
                      <ChevronLeft className="w-5 h-5" aria-hidden />
                    </IconButton>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="icon" aria-label="تصغير حجم الخط" onClick={() => setFontSize(s => Math.max(14, s - 2))}>
                        <span className="text-meta font-bold">أ-</span>
                      </Button>
                      <Button variant="secondary" size="icon" aria-label="تكبير حجم الخط" onClick={() => setFontSize(s => Math.min(28, s + 2))}>
                        <span className="text-meta font-bold">+أ</span>
                      </Button>
                    </div>
                    <IconButton
                      onClick={dir === 'rtl' ? goPrev : goNext}
                      disabled={!canGoForward}
                      aria-label="السنة التالية"
                      className="disabled:opacity-40"
                    >
                      <ChevronRight className="w-5 h-5" aria-hidden />
                    </IconButton>
                  </div>
                </div>
              </AppCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}

function SimpleListView({ data }: { data: { label: string; accent: string; items: { title: string }[] } }) {

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
  const itemAnim = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO } } };

  return (
    <PageShell flush centered={false} className="px-4">
      <div className="mx-auto w-full max-w-lg">
        <PageHeader sticky title={data.label} />
        <div className="flex items-center justify-end gap-3 py-5">
          <div className="text-end">
            <h2 className="text-body font-bold text-foreground">السنن</h2>
            <p className="text-meta text-muted-foreground">{data.items.length} سنة</p>
          </div>
          <IconChip aria-hidden>
            <BookOpen className="h-5 w-5" />
          </IconChip>
        </div>
        <motion.div variants={container} initial="hidden" animate="show">
          <AppList>
            {data.items.map((sunnah, index) => (
              <motion.div key={index} variants={itemAnim} className="app-row">
                <div className="flex items-center gap-2 shrink-0">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground-subtle" aria-hidden />
                  <Heart className="w-4 h-4 text-muted-foreground-subtle" aria-hidden />
                </div>
                <p className="flex-1 text-meta font-medium text-foreground text-end leading-relaxed">{sunnah.title}</p>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/15">
                  <span className="text-mini font-bold text-primary tabular-nums">{index + 1}</span>
                </div>
              </motion.div>
            ))}
          </AppList>
        </motion.div>
      </div>
    </PageShell>
  );
}

export default function SunnahDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const data = sunnahDetailData[categoryId || ''];

  if (!data) {
    return (
      <PageShell centered={false} className="px-4">
        <div className="mx-auto w-full max-w-lg pt-4">
          <StateView
            kind="error"
            title="لم تُعرف هذه الفئة"
            body="الرابط الذي وصلت منه لا يطابق أي فئة من فئات السنن المحفوظة. ارجع إلى قائمة السنن واختر فئة من هناك."
          />
        </div>
      </PageShell>
    );
  }

  if (data.type === 'detailed') {
    return <DetailedView data={{ ...data, items: data.items as SunnahDetailItem[] }} />;
  }

  return <SimpleListView data={{ ...data, items: data.items as { title: string }[] }} />;
}
