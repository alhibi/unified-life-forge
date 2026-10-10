import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, PageShell } from '@/components/ui/app-shell';
import { BookOpen, Sparkles } from '@/lib/icons';
import { pageItem as itemAnim, pageStagger as container } from '@/lib/motion';

// أسماء السور - سيتم إضافة المحتوى الداخلي لاحقاً
const surahNames = [
  'الفاتحة', 'البقرة', 'الكهف', 'الملك',
  'الكافرون', 'الإخلاص', 'الفلق والناس', 'هود',
  'الإسراء', 'الفتح',
];

// عناوين فضائل القرآن - سيتم إضافة التفاصيل لاحقاً
const quranVirtues = [
  'أن أهل القرآن هم أهل الله',
  'أن ثواب تلاوة القرآن أعظم من أنفس أموال الدنيا',
  'أن كل حرف فيه بعشر حسنات',
  'أنه يورث الإنسان الراحة والذكر الحسن في السماء والأرض',
  'أن كل آية يحفظها المسلم يرفعه الله بها درجة في الجنة',
  'أن الماهر بالقرآن يقرنه الله تعالى بأفضل الملائكة',
  'أن أفضل الناس هو من يتعلم القرآن ويعلمه',
  'أن الله تعالى لا يعذب إنسانًا حفظ القرآن وعمل به',
  'أنه يأتي شفيقًا لأصحابه الذين كانوا يعملون به في الدنيا',
  'أن صاحب القرآن رفعه النبي صلى الله عليه وسلم إلى مراتب العلماء',
  'أن صاحب القرآن يكرمه الله عز وجل عليه وعلى والديه يوم القيامة بأنواع عظيمة من التكريم',
  'أن القرآن هو من أعظم القربات التي يتقرب بها إلى الله وأحبها إليه',
  'أن الخلق كلهم يكتبون في كل ليلة من الغافلين إلا من قرأ القرآن',
  'أن البيت الذي يقرأ فيه القرآن تحصل فيه الخيرات والبركات ويحفظ الله تعالى أهل هذا البيت من كل سوء',
];

export default function QuranVirtues() {
  const [tappedSurah, setTappedSurah] = useState<number | null>(null);

  const handleSurahTap = (i: number) => {
    setTappedSurah(i);
    setTimeout(() => setTappedSurah(null), 1500);
  };

  return (
    <PageShell flush centered={false} className="px-4 pt-2">
      <SEO title="فضائل القرآن الكريم — SmartHub" description="فضائل تلاوة وحفظ القرآن الكريم وأهل القرآن مع سور مختارة." path="/section/quran-virtues" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-page">
        {/* Header */}
        <PageHeader sticky title="فضائل القرآن" />

        <div className="pt-2 space-y-5">
        {/* Section 1: فضل سور القرآن */}
        <div className="space-y-4">
          {/* Title - icon right, text left */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" aria-hidden />
            <h2 className="text-body font-bold text-foreground">فضل سور القرآن</h2>
          </div>

          {/* Surah chips - 4 columns grid RTL */}
          <div className="grid grid-cols-4 gap-2">
            {surahNames.map((name, i) => (
              <motion.button
                key={i}
                onClick={() => handleSurahTap(i)}
                className="relative px-2 py-2.5 rounded-lg border border-border/60 bg-secondary text-mini font-semibold text-foreground hover:bg-accent transition-colors text-center overflow-hidden"
              >
                <AnimatePresence>
                  {tappedSurah === i && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-secondary text-mini text-muted-foreground font-bold"
                    >
                      قريباً
                    </motion.span>
                  )}
                </AnimatePresence>
                {name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Divider with dot */}
        <div className="flex items-center gap-0 py-1">
          <div className="h-px flex-1 bg-border/40" />
          <div className="w-2 h-2 rounded-full bg-primary mx-2" aria-hidden />
          <div className="h-px flex-1 bg-border/40" />
        </div>

        {/* Section 2: فضائل القرآن */}
        <div className="space-y-4">
          {/* Title - icon right, text left */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" aria-hidden />
            <h2 className="text-body font-bold text-foreground">فضائل القرآن</h2>
          </div>

          <motion.div variants={container} initial="hidden" animate="show">
            <AppList>
              {quranVirtues.map((virtue, index) => (
                <motion.div
                  key={index}
                  variants={itemAnim}
                  className="app-row items-center"
                >
                  {/* Number on the right (first in RTL) */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary/15">
                    <span className="text-meta font-bold text-primary tabular-nums">{index + 1}</span>
                  </div>
                  {/* Text */}
                  <p className="flex-1 text-meta font-medium text-foreground text-end leading-relaxed">{virtue}</p>
                </motion.div>
              ))}
            </AppList>
          </motion.div>
        </div>
        </div>
      </div>
    </PageShell>
  );
}
