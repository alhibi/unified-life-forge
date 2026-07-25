import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ScrollText } from '@/lib/icons';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { DiwanPoetSummary } from '@/features/diwan/lib/types';
import { useDiwanPrefetch } from '@/features/diwan/lib/hooks';

interface Props {
  poet: DiwanPoetSummary;
  index?: number;
}

/**
 * بطاقة الشاعر المحدثة بالكامل لنمط "المخطوطة" (Manuscript).
 * تعرض الشاعر كسطر أنيق يفصل بينه وبين غيره خط رفيع، مع ختم شمع أحمر عتيق.
 */
export default function PoetCard({ poet, index = 0 }: Props) {
  const { dir } = useApp();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const { prefetchPoet } = useDiwanPrefetch();
  const prefetch = () => prefetchPoet(poet.slug);

  const lifespan =
    poet.birth_year && poet.death_year
      ? `${poet.birth_year}–${poet.death_year}م`
      : poet.death_year
        ? `ت ${poet.death_year}م`
        : null;

  // الحرف الأول من اسم الشاعر لختم الشمع
  const firstLetter = poet.name_ar ? poet.name_ar.trim().charAt(0) : 'ش';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.04 } }}
      className="border-b border-[var(--hairline)] last:border-b-0"
    >
      <Link
        to={`/diwan/library/poet/${poet.slug}`}
        onPointerEnter={prefetch}
        onTouchStart={prefetch}
        className="block w-full py-5 px-1 active:scale-[0.99] transition-transform select-none focus-visible:bg-[rgba(242,233,216,0.02)] rounded-[8px]"
      >
        <div className="flex items-center gap-4">
          {/* ختم الشمع (Wax Seal) بدل الأفاتار */}
          <div
            className="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <span className="font-amiri font-bold text-[20px] text-[#F5DFC9] leading-none select-none">
              {firstLetter}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3
                  className="font-bold text-[16px] text-[#F2E9D8] truncate"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {poet.name_ar}
                </h3>
                {poet.title && (
                  <span className="text-[10px] font-tajawal text-[var(--wax)] bg-[var(--wax-soft)] border border-[var(--wax-soft2)] px-2 py-0.5 rounded-[5px] whitespace-nowrap">
                    {poet.title}
                  </span>
                )}
              </div>
              {lifespan && (
                <span className="text-[12px] font-tajawal text-[#7E7259] shrink-0">{lifespan}</span>
              )}
            </div>

            {poet.bio && (
              <p className="text-[13px] text-[#B8AA8E] leading-relaxed mt-1.5 line-clamp-2 pe-0.5">
                {poet.bio}
              </p>
            )}

            {/* صف الإحصائيات الصغير أسفل البطاقة */}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[#7E7259] font-tajawal">
              {poet.poems_count > 0 && (
                <span className="flex items-center gap-1">
                  <ScrollText className="w-3.5 h-3.5 text-[#7E7259]/80" />
                  <span>
                    {poet.poems_count}{' '}
                    <span className="text-[#B8AA8E]">
                      {poet.poems_count === 1 ? 'قصيدة' : 'قصائد'}
                    </span>
                  </span>
                </span>
              )}
              {poet.poems_count > 0 && poet.verses_count > 0 && (
                <span className="opacity-40">·</span>
              )}
              {poet.verses_count > 0 && (
                <span>
                  {poet.verses_count} <span className="text-[#B8AA8E]">بيت شعر</span>
                </span>
              )}
            </div>
          </div>
          <Chevron className="w-4 h-4 text-[#7E7259] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
    </motion.div>
  );
}
