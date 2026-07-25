import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin } from '@/lib/icons';
import { poemContexts } from '@/features/diwan/data/poetTimelines';

interface PoemContextCardProps {
  poemTitle: string;
  poetId: string;
}

/**
 * بطاقة السياق التاريخي المصممة لتبدو كملاحظة جانبية على هامش المخطوطة.
 * تتميز بخلفية عتيقة، ميل خفيف (-0.6 درجة)، علامة معينة (◆) بلون شمع الختم فوق الحافة،
 * ونصوص دقيقة عتيقة.
 */
export default function PoemContextCard({ poemTitle, poetId }: PoemContextCardProps) {
  // Find matching context
  const ctx = poemContexts.find((c) => c.poemTitle === poemTitle && c.poetId === poetId);

  if (!ctx) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative mt-4 mb-6 select-none"
      style={{
        transform: 'rotate(-0.6deg)',
      }}
    >
      {/* علامة معينة صغيرة (◆) فوق الحافة العلوية اليمنى */}
      <div className="absolute -top-[7px] end-[24px] z-raised w-[14px] h-[14px] bg-[#16130F] flex items-center justify-center text-[10px] text-[var(--wax)] leading-none select-none font-bold">
        ◆
      </div>

      <div className="p-5 rounded-[12px] border border-dashed border-[var(--hairline-strong)] bg-[var(--ink-bg-elev)] text-[#B8AA8E] relative">
        {/* Event Title */}
        <div className="flex items-center gap-2 mb-2.5">
          <MapPin className="w-3.5 h-3.5 text-[var(--wax)] flex-shrink-0" />
          <p className="text-[12px] font-bold text-[#F2E9D8] font-tajawal">{ctx.event}</p>
        </div>

        {/* Context description */}
        <p className="text-[12px] text-[#B8AA8E] leading-[1.85] font-tajawal ps-1">{ctx.context}</p>

        {/* Year badge */}
        {ctx.year && (
          <div className="flex items-center gap-1.5 mt-3 ps-1">
            <Calendar className="w-3.5 h-3.5 text-[#7E7259]" />
            <span className="text-[10px] font-semibold text-[#7E7259] bg-[rgba(242,233,216,0.04)] border border-[var(--hairline)] px-2.5 py-0.5 rounded-[5px] font-sans">
              {ctx.year}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Utility to check if a poem has context available
export function hasPoemContext(poemTitle: string, poetId: string): boolean {
  return poemContexts.some((c) => c.poemTitle === poemTitle && c.poetId === poetId);
}
