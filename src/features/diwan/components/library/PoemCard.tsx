import { motion } from 'framer-motion';
import React from 'react';
import { Link } from 'react-router-dom';

import { useDiwanPrefetch } from '@/features/diwan/lib/hooks';
import type { DiwanPoemSearchResult,DiwanPoemSummary } from '@/features/diwan/lib/types';

interface Props {
  poem: DiwanPoemSummary | DiwanPoemSearchResult;
  showPoet?: boolean;
  index?: number;
}

/**
 * بطاقة القصيدة المصممة بنمط صفوف "المخطوطة" (Manuscript).
 * تعرض القصيدة كسطر فاخر مفصول بخط دافئ، مع علامة معينة صغيرة (◆) بلون شمع الختم.
 */
export default function PoemCard({ poem, showPoet, index = 0 }: Props) {
  const search = poem as DiwanPoemSearchResult;
  const { prefetchPoem } = useDiwanPrefetch();
  const prefetch = () => prefetchPoem(poem.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.04 } }}
      className="border-b border-[var(--hairline)] last:border-b-0"
    >
      <Link
        to={`/diwan/library/poem/${poem.slug}`}
        onPointerEnter={prefetch}
        onTouchStart={prefetch}
        className="block w-full py-4 px-1 hover:bg-[rgba(242,233,216,0.015)] active:scale-[0.99] transition-all select-none rounded-[8px]"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* أيقونة معينة صغيرة بلون wax */}
            <span className="text-mini text-[var(--wax)] select-none shrink-0" aria-hidden="true">
              ◆
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3
                  className="font-bold text-meta text-[#F2E9D8] leading-tight"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {poem.title}
                </h3>
                {showPoet && search.poet_name && (
                  <span className="text-micro text-[var(--wax)] font-tajawal font-medium">
                    {search.poet_name}
                  </span>
                )}
              </div>
              {poem.opening && (
                <p
                  className="text-mini text-[#B8AA8E]/90 leading-relaxed mt-1 line-clamp-1 truncate"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {poem.opening}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* الشارات الإضافية إذا توفرت (البحر، القافية) */}
            <div className="hidden sm:flex items-center gap-1.5 text-micro font-tajawal">
              {poem.meter && (
                <span className="px-1.5 py-0.5 rounded-[4px] border border-[var(--hairline-strong)] text-[#7E7259]">
                  {poem.meter}
                </span>
              )}
              {poem.rhyme && (
                <span className="px-1.5 py-0.5 rounded-[4px] border border-[var(--hairline-strong)] text-[#7E7259]">
                  روي {poem.rhyme}
                </span>
              )}
            </div>

            {poem.verses_count > 0 && (
              <span className="text-mini text-[#7E7259] font-tajawal">
                {poem.verses_count} {' '}
                <span className="text-[#7E7259]/60">{poem.verses_count === 1 ? 'بيت' : 'أبيات'}</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
