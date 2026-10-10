import React from 'react';

import { AppRow, IconChip } from '@/components/ui/app-shell';
import { ChevronLeft, Layers } from '@/lib/icons';

import { GermanShelf } from '../types';
import { FurnaceButton } from './FurnaceButton';

interface ShelfCardProps {
  shelf: GermanShelf;
  itemCount?: number;
  onOpenFurnace?: (shelf: GermanShelf, e: React.MouseEvent) => void;
  onClick: () => void;
}

/**
 * ShelfCard — one situational shelf, as a row of the shelf wall.
 *
 * System pass: the paper-gradient wash, the hand-written hover shadow and the
 * bespoke tag strip are gone. The wall is now <AppList> + <AppRow> like every
 * other list in the app — one chrome, one divider tone, one press language.
 * The row is a div (not a button) so the Furnace 'D' can stay a real button
 * inside it, exactly the pattern the crypto watchlist rows use. The German
 * title and the Arabic description both live in the subtitle slot.
 */
export const ShelfCard: React.FC<ShelfCardProps> = ({
  shelf,
  itemCount,
  onOpenFurnace,
  onClick,
}) => {
  const subtitle = [shelf.title_de, shelf.description_ar].filter(Boolean).join(' — ');

  return (
    <AppRow
      as="div"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer"
      leading={
        <IconChip tone="plain" aria-hidden>
          <Layers className="h-5 w-5" />
        </IconChip>
      }
      title={shelf.title_ar}
      subtitle={subtitle || undefined}
      value={typeof itemCount === 'number' ? `${itemCount} عنصر` : undefined}
    >
      {/* Furnace 'D' Button — opens the AI generation modal for this shelf */}
      {onOpenFurnace && (
        <FurnaceButton
          size="sm"
          currentCount={itemCount ?? 0}
          targetCount={shelf.target_entry_count || 25}
          onClick={(e) => onOpenFurnace(shelf, e!)}
        />
      )}
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground-subtle" aria-hidden />
    </AppRow>
  );
};
