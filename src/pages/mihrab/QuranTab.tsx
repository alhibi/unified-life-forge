import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import {
  BookMarked, Sparkles, ChevronLeft, ChevronRight, RotateCcw,
} from '@/lib/icons';

/**
 * Mihrab → Quran tab.
 *
 * A landing surface in front of the existing Tafsir and
 * Quran-Virtues pages. Adds a small "continue where you left off"
 * affordance by reading the same `tafsir-state` localStorage entry
 * that `pages/Tafsir.tsx` writes — no extra coupling, just a peek.
 */

const SURAH_NAMES_AR = [
  'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس',
  'هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه',
  'الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم',
  'لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر',
  'فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق',
  'الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة',
  'الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج',
  'نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس',
  'التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد',
  'الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات',
  'القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر',
  'المسد','الإخلاص','الفلق','الناس',
];

interface LastTafsirPosition {
  surah: number;
  ayah: number | null;
  tafsirId: string;
}

function readLastPosition(): LastTafsirPosition | null {
  try {
    const raw = localStorage.getItem('tafsir-state');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.surah === 'number') return parsed as LastTafsirPosition;
    return null;
  } catch { return null; }
}

import { pageStagger as stagger, pageItem as item } from '@/lib/motion';

export default function QuranTab() {
  const { language, dir } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  // Read once on mount — the surah picker on /tafsir updates this
  // value. Re-reading on every render isn't necessary because
  // navigating away unmounts this tab.
  const [lastPos] = useState<LastTafsirPosition | null>(readLastPosition);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {/* Continue-reading card — only when there's a saved position */}
      {lastPos && (
        <motion.button
          variants={item}
          onClick={() => navigate('/tafsir')}
          className="w-full relative overflow-hidden rounded-xl bg-card border border-border px-4 py-4 text-start active:scale-[0.99] transition-transform"
        >
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                {isAr ? 'متابعة القراءة' : 'Weiterlesen'}
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {SURAH_NAMES_AR[lastPos.surah]}
                {lastPos.ayah ? (isAr ? ` — الآية ${lastPos.ayah}` : ` — Ayah ${lastPos.ayah}`) : ''}
              </p>
            </div>
            <Arrow className="w-4 h-4 text-primary shrink-0" />
          </div>
        </motion.button>
      )}

      {/* Tafsir card */}
      <motion.button
        variants={item}
        onClick={() => navigate('/tafsir')}
        className="surface-depth surface-depth-pressable w-full flex items-center gap-3 p-4 rounded-xl hover:border-primary/30 text-start"
      >
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookMarked className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {isAr ? 'التفسير' : 'Tafsir'}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
            {isAr
              ? 'تفسير القرآن الكريم من أمّهات كتب التفسير: الميسّر، الجلالين، ابن كثير، القرطبي، الطبري...'
              : 'Quran-Tafsir aus klassischen Werken: Muyassar, Dschalālayn, Ibn Kathīr, Qurṭubī, Ṭabarī...'}
          </p>
        </div>
        <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.button>

      {/* Quran Virtues card */}
      <motion.button
        variants={item}
        onClick={() => navigate('/section/quran-virtues')}
        className="surface-depth surface-depth-pressable w-full flex items-center gap-3 p-4 rounded-xl hover:border-primary/30 text-start"
      >
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {isAr ? 'فضائل القرآن' : 'Quran-Vorzüge'}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
            {isAr
              ? 'فضل تلاوة القرآن وحفظه، وفضائل سور مختارة.'
              : 'Vorzüge der Quran-Rezitation und ausgewählter Suren.'}
          </p>
        </div>
        <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.button>
    </motion.div>
  );
}
