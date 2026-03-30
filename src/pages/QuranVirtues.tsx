import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';

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

const container = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const itemAnim = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function QuranVirtues() {
  const [tappedSurah, setTappedSurah] = useState<number | null>(null);
  const navigate = useNavigate();
  const { dir } = useApp();

  const handleSurahTap = (i: number) => {
    setTappedSurah(i);
    setTimeout(() => setTappedSurah(null), 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center">
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">فضائل القرآن</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Section 1: فضل سور القرآن */}
        <div className="space-y-4">
          {/* Title - icon right, text left */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">فضل سور القرآن</h2>
          </div>

          {/* Surah chips - 4 columns grid RTL */}
          <div className="grid grid-cols-4 gap-2">
            {surahNames.map((name, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSurahTap(i)}
                className="relative px-2 py-2.5 rounded-xl bg-card border border-border/50 text-[13px] font-semibold text-foreground hover:bg-accent/40 transition-colors text-center overflow-hidden"
              >
                <AnimatePresence>
                  {tappedSurah === i && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-card text-xs text-muted-foreground font-bold"
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
          <div className="w-2 h-2 rounded-full bg-primary mx-2" />
          <div className="h-px flex-1 bg-border/40" />
        </div>

        {/* Section 2: فضائل القرآن */}
        <div className="space-y-4">
          {/* Title - icon right, text left */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">فضائل القرآن</h2>
          </div>

          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-2.5">
            {quranVirtues.map((virtue, index) => (
              <motion.div
                key={index}
                variants={itemAnim}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-card border border-border/50"
              >
                {/* Number on the right (first in RTL) */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary/15">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                {/* Text */}
                <p className="flex-1 text-sm font-medium text-foreground text-right leading-relaxed">{virtue}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
