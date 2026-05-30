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
  isAr,
  prefs,
  onChange,
}: {
  isAr: boolean;
  prefs: ListPrefs;
  onChange: (next: Partial<ListPrefs>) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'تفضيلات العرض' : 'Display preferences'}
          title={isAr ? 'فرز ، تجميع ، كثافة' : 'Sort, group, density'}
        >
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-3 space-y-3"
      >
        {/* Sort */}
        <Group label={isAr ? 'الترتيب' : 'Sort'}>
          <Segmented
            value={prefs.sort}
            options={[
              {
                value: 'newest' as SortMode,
                label: isAr ? 'الأحدث' : 'Newest',
                icon: <ArrowDownWideNarrow className="h-3.5 w-3.5" />,
              },
              {
                value: 'oldest' as SortMode,
                label: isAr ? 'الأقدم' : 'Oldest',
                icon: <ArrowUpWideNarrow className="h-3.5 w-3.5" />,
              },
              {
                value: 'unread-first' as SortMode,
                label: isAr ? 'غير المقروء أولاً' : 'Unread first',
                icon: <ArrowDownAZ className="h-3.5 w-3.5" />,
              },
            ]}
            onChange={(v) => onChange({ sort: v })}
          />
        </Group>

        {/* Group */}
        <Group label={isAr ? 'التجميع' : 'Group'}>
          <Segmented
            value={prefs.group}
            options={[
              {
                value: 'off' as GroupMode,
                label: isAr ? 'بلا' : 'None',
                icon: <List className="h-3.5 w-3.5" />,
              },
              {
                value: 'date' as GroupMode,
                label: isAr ? 'حسب التاريخ' : 'By date',
                icon: <CalendarDays className="h-3.5 w-3.5" />,
              },
            ]}
            onChange={(v) => onChange({ group: v })}
          />
        </Group>

        {/* Density */}
        <Group label={isAr ? 'الكثافة' : 'Density'}>
          <Segmented
            value={prefs.density}
            options={[
              {
                value: 'compact' as Density,
                label: isAr ? 'مضغوط' : 'Compact',
                icon: <Rows3 className="h-3.5 w-3.5" />,
              },
              {
                value: 'comfortable' as Density,
                label: isAr ? 'مريح' : 'Comfortable',
                icon: <List className="h-3.5 w-3.5" />,
              },
              {
                value: 'cards' as Density,
                label: isAr ? 'بطاقات' : 'Cards',
                icon: <LayoutGrid className="h-3.5 w-3.5" />,
              },
            ]}
            onChange={(v) => onChange({ density: v })}
          />
        </Group>

        {/* Toggles */}
        <div className="pt-1 space-y-2">
          <ToggleRow
            label={isAr ? 'وسم تلقائي عند التمرير' : 'Auto-mark on scroll'}
            description={
              isAr
                ? 'يضع المقالة كمقروءة فور تجاوزها أعلى الشاشة'
                : 'Marks an article read once it scrolls past the top'
            }
            checked={prefs.autoMarkOnScroll}
            onChange={(v) => onChange({ autoMarkOnScroll: v })}
          />
          <ToggleRow
            label={isAr ? 'لوحان جنباً إلى جنب (للشاشات الكبيرة)' : 'Two-pane on desktop'}
            description={
              isAr
                ? 'يعرض القارئ بجانب القائمة على الشاشات الكبيرة'
                : 'Shows the reader alongside the list on wide screens'
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
                ? 'bg-background text-foreground shadow-sm'
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
