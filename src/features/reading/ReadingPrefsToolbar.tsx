import {
  ArrowDownAZ, ArrowDownWideNarrow, ArrowUpWideNarrow,
  CalendarDays, LayoutGrid, List, Rows3, SlidersHorizontal,
} from '@/lib/icons';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import type { Density, GroupMode, ListPrefs, SortMode } from './listPrefs';

/**
 * Compact preferences popover that surfaces the list-display knobs
 * borrowed from ReadYou and CapyReader: sort order, grouping,
 * density, auto-mark-on-scroll, and two-pane mode.
 *
 * Designed to sit in the header next to the search/refresh icons —
 * the trigger is a single sliders icon so it doesn't crowd the
 * existing toolbar. The popover content is a tight stack of
 * segmented-button controls so the user can flick between modes
 * without scrolling. Mobile-friendly: touch targets are >= 36 px.
 */
export function ReadingPrefsToolbar({
  prefs,
  onChange,
}: {
  prefs: ListPrefs;
  onChange: (next: Partial<ListPrefs>) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={'تفضيلات العرض'}
          title={'فرز ، تجميع ، كثافة'}
        >
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-3 space-y-3"
      >
        {/* Sort */}
        <Group label={'الترتيب'}>
          <Segmented
            value={prefs.sort}
            options={[
              {
                value: 'newest' as SortMode,
                label: 'الأحدث',
                icon: <ArrowDownWideNarrow className="h-3.5 w-3.5" />,
              },
              {
                value: 'oldest' as SortMode,
                label: 'الأقدم',
                icon: <ArrowUpWideNarrow className="h-3.5 w-3.5" />,
              },
              {
                value: 'unread-first' as SortMode,
                label: 'غير المقروء أولاً',
                icon: <ArrowDownAZ className="h-3.5 w-3.5" />,
              },
            ]}
            onChange={(v) => onChange({ sort: v })}
          />
        </Group>

        {/* Group */}
        <Group label={'التجميع'}>
          <Segmented
            value={prefs.group}
            options={[
              {
                value: 'off' as GroupMode,
                label: 'بلا',
                icon: <List className="h-3.5 w-3.5" />,
              },
              {
                value: 'date' as GroupMode,
                label: 'حسب التاريخ',
                icon: <CalendarDays className="h-3.5 w-3.5" />,
              },
            ]}
            onChange={(v) => onChange({ group: v })}
          />
        </Group>

        {/* Density */}
        <Group label={'الكثافة'}>
          <Segmented
            value={prefs.density}
            options={[
              {
                value: 'compact' as Density,
                label: 'مضغوط',
                icon: <Rows3 className="h-3.5 w-3.5" />,
              },
              {
                value: 'comfortable' as Density,
                label: 'مريح',
                icon: <List className="h-3.5 w-3.5" />,
              },
              {
                value: 'cards' as Density,
                label: 'بطاقات',
                icon: <LayoutGrid className="h-3.5 w-3.5" />,
              },
            ]}
            onChange={(v) => onChange({ density: v })}
          />
        </Group>

        {/* Toggles */}
        <div className="pt-1 space-y-2">
          <ToggleRow
            label={'وسم تلقائي عند التمرير'}
            description={
              'يضع المقالة كمقروءة فور تجاوزها أعلى الشاشة'
            }
            checked={prefs.autoMarkOnScroll}
            onChange={(v) => onChange({ autoMarkOnScroll: v })}
          />
          <ToggleRow
            label={'لوحان جنباً إلى جنب (للشاشات الكبيرة)'}
            description={
              'يعرض القارئ بجانب القائمة على الشاشات الكبيرة'
            }
            checked={prefs.twoPaneOnDesktop}
            onChange={(v) => onChange({ twoPaneOnDesktop: v })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Group({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h6 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </h6>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; icon?: React.ReactNode }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 p-0.5 rounded-xl bg-accent/30">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-h-9 px-2 rounded-lg text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-all ${
              active
                ? 'bg-background text-foreground '
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={active}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 py-1.5 cursor-pointer">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground leading-tight">
          {label}
        </p>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="shrink-0 mt-0.5"
      />
    </label>
  );
}
