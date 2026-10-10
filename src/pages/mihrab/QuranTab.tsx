/**
 * Mihrab → Quran tab.
 *
 * Was: a "continue reading" peek plus two link cards. Now the tab is somewhere
 * you can act:
 *   • WirdCard — set and tick the daily portion (feeds the streak).
 *   • SurahJump — search all 114 sūrahs and open the reader there directly,
 *     instead of tapping through to the reader's own picker.
 *   • Then the two deep links, as one grouped list (AppList/AppRow) — the
 *     system-unification pass replaced the per-row cards and bespoke chips.
 *
 * `tafsir-state` is still only *read* here (the reader owns that key), so the
 * coupling stays one-way.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppList, AppRow, IconChip } from '@/components/ui/app-shell';
import SurahJump from '@/features/mihrab/components/SurahJump';
import WirdCard from '@/features/mihrab/components/WirdCard';
import { SURAH_NAMES } from '@/features/mihrab/data/surahIndex';
import { BookMarked, RotateCcw, Sparkles } from '@/lib/icons';
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
        <motion.div variants={item}>
          <AppList>
            <AppRow
              onClick={() => navigate('/tafsir')}
              chevron
              leading={
                <IconChip tone="plain" aria-hidden>
                  <RotateCcw className="h-5 w-5" />
                </IconChip>
              }
              title="متابعة القراءة"
              subtitle={`${SURAH_NAMES[lastPos.surah] ?? '—'}${
                lastPos.ayah ? ` — الآية ${lastPos.ayah}` : ''
              }`}
            />
          </AppList>
        </motion.div>
      )}

      <motion.div variants={item}>
        <SurahJump />
      </motion.div>

      <motion.div variants={item}>
        <AppList>
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <AppRow
                key={link.to}
                onClick={() => navigate(link.to)}
                chevron
                leading={
                  <IconChip tone="plain" aria-hidden>
                    <Icon className="h-5 w-5" />
                  </IconChip>
                }
                title={link.title}
                subtitle={link.detail}
              />
            );
          })}
        </AppList>
      </motion.div>
    </motion.div>
  );
}
