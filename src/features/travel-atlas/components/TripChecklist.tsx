import { useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Plus, Trash2 } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { CHECKLIST_CATEGORY_META, CHECKLIST_SUGGESTIONS } from '../data/categories';
import { useAddChecklistItems, useRemoveChecklistItem, useSetChecklistItemDone } from '../hooks';
import type { ChecklistCategory, TripChecklistItem } from '../types';

interface TripChecklistProps {
  tripId: string;
  items: TripChecklistItem[];
}

/**
 * Packing and paperwork.
 *
 * The list starts from suggestions rather than empty, because the value is in not
 * having to remember that the international driving permit exists — a blank list
 * only helps someone who already remembered. Tapping a suggestion adds it; the
 * suggestions already on the list disappear from the tray.
 */
export default function TripChecklist({ tripId, items }: TripChecklistProps) {
  const addItems = useAddChecklistItems();
  const setDone = useSetChecklistItemDone();
  const removeItem = useRemoveChecklistItem();

  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<ChecklistCategory>('other');

  const existingLabels = useMemo(() => new Set(items.map((item) => item.label.trim())), [items]);
  const suggestions = useMemo(
    () => CHECKLIST_SUGGESTIONS.filter((entry) => !existingLabels.has(entry.label)),
    [existingLabels],
  );

  const grouped = useMemo(
    () =>
      CHECKLIST_CATEGORY_META.map((meta) => ({
        meta,
        entries: items.filter((item) => item.category === meta.value),
      })).filter((group) => group.entries.length > 0),
    [items],
  );

  const doneCount = items.filter((item) => item.isDone).length;

  const addTyped = () => {
    const trimmed = label.trim();
    if (trimmed.length === 0) return;
    addItems.mutate({ tripId, items: [{ label: trimmed, category }] });
    setLabel('');
  };

  return (
    <div className="app-stack-sm">
      {items.length > 0 && (
        <AppCard className="p-0">
          <p className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="text-body text-foreground">جهّزت</span>
            <span className="font-mono text-mini tabular-nums text-muted-foreground">
              {doneCount} / {items.length}
            </span>
          </p>

          {grouped.map((group) => {
            const Icon = group.meta.icon;
            return (
              <section key={group.meta.value}>
                <h4 className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-micro uppercase tracking-[0.08em] text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {group.meta.label}
                </h4>
                <ul className="divide-y divide-border">
                  {group.entries.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => setDone.mutate({ itemId: item.id, isDone: !item.isDone })}
                        aria-pressed={item.isDone}
                        className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-start"
                      >
                        <span
                          className={cn(
                            'grid h-6 w-6 shrink-0 place-items-center rounded-sm border',
                            item.isDone
                              ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))] text-background'
                              : 'border-border text-transparent',
                          )}
                          aria-hidden="true"
                        >
                          <Check className="h-4 w-4" />
                        </span>
                        <span
                          className={cn(
                            'min-w-0 truncate text-body',
                            item.isDone ? 'text-muted-foreground line-through' : 'text-foreground',
                          )}
                        >
                          {item.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem.mutate(item.id)}
                        aria-label={`حذف ${item.label}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-button text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </AppCard>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTyped();
            }
          }}
          placeholder="أضف عنصرًا…"
          aria-label="عنصر جديد"
          className="min-w-0 flex-1"
        />
        <Select value={category} onValueChange={(value) => setCategory(value as ChecklistCategory)}>
          <SelectTrigger className="w-36 shrink-0" aria-label="التصنيف">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHECKLIST_CATEGORY_META.map((meta) => (
              <SelectItem key={meta.value} value={meta.value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={addTyped}
          disabled={label.trim().length === 0}
          aria-label="أضف"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-micro text-muted-foreground">مقترحات سريعة</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.slice(0, 10).map((entry) => (
              <li key={entry.label}>
                <button
                  type="button"
                  onClick={() =>
                    addItems.mutate({
                      tripId,
                      items: [{ label: entry.label, category: entry.category }],
                    })
                  }
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-3 text-micro text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
          {suggestions.length > 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                addItems.mutate({
                  tripId,
                  items: suggestions
                    .filter((entry) => entry.category === 'documents')
                    .map((entry) => ({ label: entry.label, category: entry.category })),
                })
              }
            >
              أضف كل الأوراق والوثائق
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
