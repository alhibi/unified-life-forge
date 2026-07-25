/**
 * Mihrab → Quran tab.
 *
 * Was: a "continue reading" peek plus two link cards. Now the tab is somewhere
 * you can act:
 *   • WirdCard — set and tick the daily portion (feeds the streak).
 *   • SurahJump — search all 114 sūrahs and open the reader there directly,
 *     instead of tapping through to the reader's own picker.
 *   • Then the two deep links, as a plain list.
 *
 * `tafsir-state` is still only *read* here (the reader owns that key), so the
 * coupling stays one-way.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import SurahJump from '@/features/mihrab/components/SurahJump';
import WirdCard from '@/features/mihrab/components/WirdCard';
import { SURAH_NAMES } from '@/features/mihrab/data/surahIndex';
import { BookMarked, ChevronLeft, RotateCcw, Sparkles } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

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
  } catch {
    return null;
  }
}

const LINKS = [
  {
    to: '/tafsir',
    icon: BookMarked,
    title: 'التفسير',
    detail: 'الميسّر، الجلالين، ابن كثير، القرطبي، الطبري.',
  },
  {
    to: '/section/quran-virtues',
    icon: Sparkles,
    title: 'فضائل القرآن',
    detail: 'فضل التلاوة والحفظ، وفضائل سور مختارة.',
  },
] as const;

export default function QuranTab() {
  const navigate = useNavigate();
  // Read once on mount: navigating away unmounts the tab, so there is nothing
  // to keep in sync.
  const [lastPos] = useState<LastTafsirPosition | null>(readLastPosition);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <WirdCard />
      </motion.div>

      {lastPos && (
        <motion.button
          variants={item}
          onClick={() => navigate('/tafsir')}
          className="app-card app-card-pressable flex w-full items-center gap-3 text-start"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <RotateCcw className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              متابعة القراءة
            </span>
            <span className="mt-0.5 block truncate text-meta font-semibold text-foreground">
              {SURAH_NAMES[lastPos.surah] ?? '—'}
              {lastPos.ayah ? ` — الآية ${lastPos.ayah}` : ''}
            </span>
          </span>
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
        </motion.button>
      )}

      <motion.div variants={item}>
        <SurahJump />
      </motion.div>

      <motion.div variants={item} className="space-y-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(link.to)}
              className="app-card app-card-pressable flex w-full items-center gap-3 text-start"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-meta font-semibold text-foreground">{link.title}</span>
                <span className="mt-0.5 block text-mini text-muted-foreground">{link.detail}</span>
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
            </button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
