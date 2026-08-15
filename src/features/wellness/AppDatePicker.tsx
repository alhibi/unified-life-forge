import { format, parse } from 'date-fns';
import { ar } from 'date-fns/locale';
import React, { useState } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useApp } from '@/contexts/AppContext';
import { CalendarIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface Props {
  /** ISO yyyy-MM-dd */
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}

/**
 * Themed date picker matching the app's Obsidian Depth aesthetic.
 * Replaces the native browser date popup with an in-app calendar.
 */
export default function AppDatePicker({ value, onChange, className }: Props) {
  const { dir } = useApp();
  const locale = ar;
  const [open, setOpen] = useState(false);

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const label = selected
    ? format(selected, 'd MMM yyyy', { locale })
    : 'اختر تاريخاً';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 bg-muted/60 border border-border/40 rounded-lg px-3 py-1.5',
            'text-meta font-medium text-foreground outline-none transition-all',
            'hover:bg-muted active:scale-[0.97] duration-150',
            'focus-visible:ring-2 focus-visible:ring-primary/40',
 className,
 )}
 dir="ltr"
 >
 <CalendarIcon className="w-3.5 h-3.5 text-primary" />
 <span className="tabular-nums">{label}</span>
 </button>
 </PopoverTrigger>
 <PopoverContent
 align="end"
 sideOffset={8}
 className="w-auto p-0 rounded-lg border-border/50 bg-card shadow-md"
 dir={dir}
 >
 <Calendar
 mode="single"
 selected={selected}
 onSelect={(d) => {
 if (d) {
 onChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          locale={locale}
          dir={dir}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
          classNames={{
            months: 'flex flex-col',
            month: 'space-y-3',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: 'text-meta font-semibold text-foreground',
            nav: 'space-x-1 flex items-center',
            nav_button:
              'h-7 w-7 rounded-full bg-secondary hover:bg-muted transition-colors active:scale-90 duration-150 flex items-center justify-center text-foreground',
            nav_button_previous: 'absolute start-1',
            nav_button_next: 'absolute end-1',
            table: 'w-full border-collapse',
            head_row: 'grid grid-cols-7',
            head_cell:
              'text-muted-foreground/70 font-medium text-micro uppercase tracking-wider py-1.5 text-center',
            row: 'grid grid-cols-7 mt-0.5',
            cell: 'relative p-0.5 text-center',
            day: cn(
              'h-9 w-9 mx-auto rounded-lg text-mini font-medium text-foreground',
              'hover:bg-secondary transition-colors duration-200 active:scale-90',
              'aria-selected:opacity-100 tabular-nums',
            ),
            day_selected:
              'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary ',
            day_today: 'ring-1 ring-primary/40 text-primary font-bold',
            day_outside: 'text-muted-foreground/40',
            day_disabled: 'text-muted-foreground/30',
            day_hidden: 'invisible',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
