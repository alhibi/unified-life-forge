import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DiwanPoemSummary, DiwanPoemSearchResult } from '@/lib/diwan/types';
import { useDiwanPrefetch } from '@/lib/diwan/hooks';

interface Props {
  poem: DiwanPoemSummary | DiwanPoemSearchResult;
  showPoet?: boolean;
  index?: number;
}

export default function PoemCard({ poem, showPoet, index = 0 }: Props) {
  const search = poem as DiwanPoemSearchResult;
  const { prefetchPoem } = useDiwanPrefetch();
  const prefetch = () => prefetchPoem(poem.slug);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.04 } }}
    >
      <Link
        to={`/diwan/library/poem/${poem.slug}`}
        onPointerEnter={prefetch}
        onTouchStart={prefetch}
        className="block w-full rounded-2xl bg-card border border-border/40 p-4 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start gap-2 mb-1.5">
          <ScrollText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <h3 className="font-semibold text-[14px] text-foreground line-clamp-1 flex-1">
            {poem.title}
          </h3>
        </div>
        {poem.opening && (
          <p
            className="text-[14px] text-foreground/80 leading-[1.9] mb-2 line-clamp-1 truncate"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {poem.opening}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {showPoet && search.poet_name && (
            <span className="text-primary font-semibold">
              {search.poet_name}
            </span>
          )}
          {showPoet && search.poet_name && (poem.meter || poem.rhyme || poem.kind) && <span className="text-muted-foreground">·</span>}
          {poem.kind && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
              {poem.kind}
            </span>
          )}
          {poem.meter && (
            <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-400 font-medium">
              {poem.meter}
            </span>
          )}
          {poem.rhyme && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
              قافية {poem.rhyme}
            </span>
          )}
          {poem.verses_count > 0 && (
            <span className="text-muted-foreground">
              {poem.verses_count} {poem.verses_count === 1 ? 'بيت' : 'أبيات'}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
