import { cn } from '@/lib/utils';

import { CATEGORIES, CATEGORY_GROUPS } from '../../data/categories';
import type { PlaceCategory } from '../../types';

interface CategoryPickerProps {
  value: PlaceCategory;
  onChange: (category: PlaceCategory) => void;
}

/**
 * Sixteen categories as a glyph grid rather than a dropdown.
 *
 * A select would hide the vocabulary behind a tap and give no sense of what the
 * options are; laid out in groups the whole taxonomy is legible at a glance,
 * which is what makes people file a place accurately instead of always picking
 * the first entry.
 */
export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div className="space-y-3">
      {CATEGORY_GROUPS.map((group) => (
        <fieldset key={group.key}>
          <legend className="app-section-label">{group.label}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.filter((category) => category.group === group.key).map((category) => {
              const Icon = category.icon;
              const isActive = category.value === value;
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => onChange(category.value)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex min-h-[3.25rem] items-center gap-2 rounded-card border px-3 py-2 text-start transition-colors',
                    isActive
                      ? 'border-[hsl(var(--live))] bg-[hsl(var(--live)/0.1)] text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate text-mini">{category.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
