import React from 'react';
import type { DiwanEra } from '@/features/diwan/lib/types';

interface Props {
  eras: DiwanEra[];
  selected: string | null;
  onSelect: (eraId: string | null) => void;
  showAll?: boolean;
}

/**
 * صفّ من شارات قابلة للتمرير الأفقي. تظهر في كل صفحات التصفية —
 * الشعراء، البحث، إلخ — لتوحيد التجربة.
 *
 * كل شارة `<button>` فعلية مع `aria-pressed` فيقرؤها قارئ الشاشة
 * كـ "tab/toggle" ويصرّح بالحالة المختارة.
 */
export default function EraPills({ eras, selected, onSelect, showAll = true }: Props) {
  return (
    <div
      className="overflow-x-auto -mx-1 pb-2 scrollbar-thin"
      role="group"
      aria-label="فلتر العصور الأدبية"
    >
      <div className="flex items-center gap-1.5 px-1 min-w-min">
        {showAll && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={selected === null}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              selected === null
                ? 'bg-foreground text-background'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            الكلّ
          </button>
        )}
        {eras.map(era => {
          const active = selected === era.id;
          return (
            <button
              key={era.id}
              type="button"
              onClick={() => onSelect(active ? null : era.id)}
              aria-pressed={active}
              aria-label={`عصر ${era.name_ar}`}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${
                active
                  ? 'text-background border-transparent'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground border-transparent'
              }`}
              style={active ? {
                background: era.color ?? 'currentColor',
                color: '#fff',
              } : undefined}
            >
              {era.name_ar}
            </button>
          );
        })}
      </div>
    </div>
  );
}
