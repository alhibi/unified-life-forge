import React from 'react';
import type { DiwanEra } from '@/features/diwan/lib/types';
import { poetryEras } from '@/features/diwan/data/poetryData';

interface Props {
  eras: DiwanEra[];
  selected: string | null;
  onSelect: (eraId: string | null) => void;
  showAll?: boolean;
}

/**
 * تبويبات العصور المصممة بنمط "المخطوطة" (Manuscript).
 * صف أفقي قابل للتمرير، كل تبويب نص + عدّاد صغير، بدون خلفية،
 * مع خط سفلي بلون شمع الختم (wax) تحت النشط.
 */
export default function EraPills({ eras, selected, onSelect, showAll = true }: Props) {
  // دالة لحساب عدد الشعراء الفعلي من البيانات المحلية لكل عصر
  const getPoetsCount = (eraId: string | null): number => {
    if (!eraId) {
      return poetryEras.reduce((sum, era) => sum + (era.poets?.length || 0), 0);
    }
    const matchingEra = poetryEras.find(e => e.id === eraId);
    return matchingEra?.poets?.length || 0;
  };

  return (
    <div
      className="overflow-x-auto -mx-5 px-5 pb-2 scrollbar-none"
      role="group"
      aria-label="تبويبات العصور الأدبية"
    >
      <div className="flex items-center gap-6 min-w-max border-b border-[var(--hairline)]">
        {showAll && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={selected === null}
            className="relative pb-3 text-[14px] font-medium transition-all flex items-center gap-1.5 focus:outline-none focus-visible:text-[var(--ink-text)]"
            style={{
              color: selected === null ? 'var(--ink-text)' : 'var(--ink-text-dim)',
              borderBottom: selected === null ? '2px solid var(--wax)' : '2px solid transparent',
            }}
          >
            <span className="font-tajawal">الكلّ</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-sans transition-all"
              style={{
                backgroundColor: selected === null ? 'var(--wax-soft)' : 'rgba(242,233,216,0.05)',
                color: selected === null ? 'var(--wax)' : 'var(--ink-text-faint)',
              }}
            >
              {getPoetsCount(null)}
            </span>
          </button>
        )}
        {eras.map(era => {
          const active = selected === era.id;
          const count = getPoetsCount(era.id);
          return (
            <button
              key={era.id}
              type="button"
              onClick={() => onSelect(active ? null : era.id)}
              aria-pressed={active}
              aria-label={`عصر ${era.name_ar}`}
              className="relative pb-3 text-[14px] font-medium transition-all flex items-center gap-1.5 focus:outline-none focus-visible:text-[var(--ink-text)]"
              style={{
                color: active ? 'var(--ink-text)' : 'var(--ink-text-dim)',
                borderBottom: active ? '2px solid var(--wax)' : '2px solid transparent',
              }}
            >
              <span className="font-tajawal">{era.name_ar}</span>
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-sans transition-all"
                  style={{
                    backgroundColor: active ? 'var(--wax-soft)' : 'rgba(242,233,216,0.05)',
                    color: active ? 'var(--wax)' : 'var(--ink-text-faint)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
