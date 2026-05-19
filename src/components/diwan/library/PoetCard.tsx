import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Feather, ScrollText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { DiwanPoetSummary } from '@/lib/diwan/types';
import { useDiwanPrefetch } from '@/lib/diwan/hooks';

interface Props {
  poet: DiwanPoetSummary;
  index?: number;
}

export default function PoetCard({ poet, index = 0 }: Props) {
  const { dir } = useApp();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const { prefetchPoet } = useDiwanPrefetch();
  const prefetch = () => prefetchPoet(poet.slug);

  const lifespan = poet.birth_year && poet.death_year
    ? `${poet.birth_year}–${poet.death_year}م`
    : poet.death_year ? `ت ${poet.death_year}م` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.04 } }}
    >
      <Link
        to={`/diwan/library/poet/${poet.slug}`}
        onPointerEnter={prefetch}
        onTouchStart={prefetch}
        className="block w-full rounded-xl bg-card border border-border/40 px-3 py-2.5 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Feather className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className="font-bold text-[13.5px] text-foreground truncate leading-tight"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {poet.name_ar}
              </h3>
              {poet.title && (
                <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {poet.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-muted-foreground">
              {lifespan && <span>{lifespan}</span>}
              {lifespan && (poet.poems_count > 0 || poet.verses_count > 0) && <span>·</span>}
              {poet.poems_count > 0 && (
                <span className="flex items-center gap-0.5">
                  <ScrollText className="w-2.5 h-2.5" />
                  {poet.poems_count} {poet.poems_count === 1 ? 'قصيدة' : 'قصائد'}
                </span>
              )}
              {poet.verses_count > 0 && (
                <span>· {poet.verses_count} بيت</span>
              )}
            </div>
          </div>
          <Chevron className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}
