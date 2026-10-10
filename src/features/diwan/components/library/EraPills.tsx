import React from 'react';

import type { DiwanEra } from '@/features/diwan/lib/types';

interface Props {
  eras: DiwanEra[];
  selected: string | null;
  onSelect: (eraId: string | null) => void;
  showAll?: boolean;
}

/**
 * تبويبات العصور — صف أفقي قابل للتمرير، كل تبويب نصّ + عدّاد اختياري،
 * والنشط تحته خط بلون الإبراز الوحيد. كانت الألوان تُكتب خامًا
 * (متغيّرات ink وwax وقيم rgba)؛ الآن كلها من التوكنز الدلالية.
 *
 * Counts come from `era.poets_count`, which only the local fallback provides.
 * This component used to import the 610-poem seed corpus directly to compute
 * them, which (a) pulled a 349 kB gzipped chunk into every route that renders
 * era tabs and (b) displayed local counts next to a poet list that may have
 * come from Supabase. When the count is absent the badge is simply not drawn.
 */
export default function EraPills({ eras, selected, onSelect, showAll = true }: Props) {
  const totalPoets = eras.reduce((sum, era) => sum + (era.poets_count ?? 0), 0);
  const getPoetsCount = (eraId: string | null): number =>
    eraId === null ? totalPoets : (eras.find((e) => e.id === eraId)?.poets_count ?? 0);

  const tabClass = (active: boolean) =>
    `relative flex items-center gap-1.5 border-b-2 pb-3 text-meta font-medium transition-motion ${
      active
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  const badgeClass = (active: boolean) =>
    `rounded-full px-1.5 py-0.5 font-sans text-micro tabular-nums transition-motion ${
      active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
    }`;

  return (
    <div className="scrollbar-none -mx-5 overflow-x-auto px-5 pb-2" role="group" aria-label="تبويبات العصور الأدبية">
      <div className="flex min-w-max items-center gap-6 border-b border-border">
        {showAll && (
          <button type="button" onClick={() => onSelect(null)} aria-pressed={selected === null} className={tabClass(selected === null)}>
            <span className="font-tajawal">الكلّ</span>
            {totalPoets > 0 && <span className={badgeClass(selected === null)}>{totalPoets}</span>}
          </button>
        )}
        {eras.map((era) => {
          const active = selected === era.id;
          const count = getPoetsCount(era.id);
          return (
            <button
              key={era.id}
              type="button"
              onClick={() => onSelect(active ? null : era.id)}
              aria-pressed={active}
              aria-label={`عصر ${era.name_ar}`}
              className={tabClass(active)}
            >
              <span className="font-tajawal">{era.name_ar}</span>
              {count > 0 && <span className={badgeClass(active)}>{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
