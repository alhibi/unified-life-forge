import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import { AppCard, AppList, IconButton, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { useApp } from '@/contexts/AppContext';
import { sunnahDetailData, SunnahDetailItem } from '@/data/sunnahDetailData';
import { arabicDigits } from '@/features/mihrab/lib/arabicDigits';
import { BookOpen, ChevronLeft, ChevronRight, Copy, Share2 } from '@/lib/icons';
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
    <PageShell
      header={
        <PageHeader
          sticky
          title={data.label}
          subtitle={arabicDigits(currentIndex + 1) + ' من ' + arabicDigits(total)}
          backFallback="/section/timed-sunnah"
        />
      }
    >
      <div className="w-full">
        {/* Reading progress — state, not decoration. */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-track">
          <div className="h-full bg-primary transition-motion duration-normal" style={{ width: String(((currentIndex + 1) / total) * 100) + '%' }} />
        </div>

        <div className="flex items-start justify-center pt-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentIndex} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.08 }} className="w-full">
              <AppCard className="w-full overflow-hidden p-0">
                <div className="px-6 pt-6 pb-2">
                  <h2 className="text-title font-bold leading-relaxed text-foreground text-center" style={{ fontSize: String((fontSize + 2) / 16) + 'rem' }}>{item.title}</h2>
                </div>
                <div className="flex items-center justify-center gap-3 pb-3">
                  <IconButton onClick={handleCopy} aria-label="نسخ السنة">
                    <Copy className="h-4 w-4" aria-hidden />
                  </IconButton>
                  <IconButton onClick={handleShare} aria-label="مشاركة السنة">
                    <Share2 className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
                <div className="mx-6 border-t border-track" />
                <div className="px-6 py-5">
                  <p className="text-center text-foreground leading-loose" style={{ fontSize: String(fontSize / 16) + 'rem' }}>{item.description}</p>
                </div>
                <div className="mx-6 mb-4">
                  <div className="flex items-center justify-end gap-2 rounded-md bg-secondary px-4 py-3">
                    <span className="text-meta font-semibold text-foreground">{item.source}</span>
                    <BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden />
                  </div>
                </div>
                <div className="mx-6 mb-5 border-t border-track pt-4">
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
  return (
    <PageShell
      header={
        <PageHeader
          sticky
          title={data.label}
          subtitle={arabicDigits(data.items.length) + ' سنة'}
          backFallback="/section/timed-sunnah"
        />
      }
    >
      <section aria-label={'سنن ' + data.label}>
        <AppList>
          {data.items.map((sunnah, index) => (
            <div key={index} className="app-row items-start">
              <span
                className="w-8 shrink-0 pt-0.5 text-mini font-semibold tabular-nums text-muted-foreground-subtle"
                aria-hidden
              >
                {arabicDigits(index + 1)}
              </span>
              <p className="flex-1 text-body leading-relaxed text-foreground">{sunnah.title}</p>
            </div>
          ))}
        </AppList>
      </section>
    </PageShell>
  );
}

export default function SunnahDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const data = sunnahDetailData[categoryId || ''];

  if (!data) {
    return (
      <PageShell header={<PageHeader title="السنن" backFallback="/section/timed-sunnah" />}>
        <StateView
          kind="error"
          title="لم تُعرف هذه الفئة"
          body="الرابط الذي وصلت منه لا يطابق أي فئة من فئات السنن المحفوظة. ارجع إلى قائمة السنن واختر فئة من هناك."
          action={{
            label: 'العودة إلى السنن الموقوتة',
            onClick: () => {
              window.location.assign('/section/timed-sunnah');
            },
          }}
        />
      </PageShell>
    );
  }

  if (data.type === 'detailed') {
    return <DetailedView data={{ ...data, items: data.items as SunnahDetailItem[] }} />;
  }

  return <SimpleListView data={{ ...data, items: data.items as { title: string }[] }} />;
}
