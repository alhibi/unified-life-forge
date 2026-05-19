import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Feather, ScrollText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { DiwanPoetSummary } from '@/lib/diwan/types';

interface Props {
  poet: DiwanPoetSummary;
  index?: number;
}

export default function PoetCard({ poet, index = 0 }: Props) {
  const { dir } = useApp();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

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
        className="block w-full rounded-2xl bg-card border border-border/40 p-4 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Feather className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="font-bold text-[15px] text-foreground truncate"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {poet.name_ar}
              </h3>
              {poet.title && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  {poet.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              {lifespan && <span>{lifespan}</span>}
              {lifespan && (poet.poems_count > 0 || poet.verses_count > 0) && <span>·</span>}
              {poet.poems_count > 0 && (
                <span className="flex items-center gap-1">
                  <ScrollText className="w-3 h-3" />
                  {poet.poems_count} {poet.poems_count === 1 ? 'قصيدة' : 'قصائد'}
                </span>
              )}
              {poet.verses_count > 0 && (
                <span>· {poet.verses_count} بيت</span>
              )}
            </div>
          </div>
          <Chevron className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
        {poet.bio && (
          <p className="text-[12px] text-muted-foreground/80 leading-relaxed mt-2 line-clamp-2">
            {poet.bio}
          </p>
        )}
      </Link>
    </motion.div>
  );
}
