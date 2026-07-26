import {
  BedDouble,
  Binoculars,
  Building,
  Bus,
  Coffee,
  Compass,
  type IconComponent,
  Landmark,
  Leaf,
  MapPin,
  MoonStar,
  Mountain,
  Paintbrush,
  ScrollText,
  Store,
  Trees,
  Utensils,
  Waves,
} from '@/lib/icons';

import type { PlaceCategory, VisitStatus } from '../types';

/**
 * Category presentation.
 *
 * Categories are distinguished by GLYPH, never by colour. Sixteen coloured pins
 * on one map is confetti — and the design system allows exactly one accent. The
 * only colour encoding in the atlas is visit status (three values, below),
 * which is the axis a traveller actually scans for.
 */
export interface CategoryMeta {
  value: PlaceCategory;
  label: string;
  /** Short helper shown in the category picker. */
  hint: string;
  icon: IconComponent;
  group: CategoryGroup;
}

export type CategoryGroup = 'nature' | 'culture' | 'taste' | 'city';

export const CATEGORY_GROUPS: readonly { key: CategoryGroup; label: string }[] = [
  { key: 'nature', label: 'طبيعة' },
  { key: 'culture', label: 'ثقافة' },
  { key: 'taste', label: 'مذاق' },
  { key: 'city', label: 'مدينة' },
] as const;

export const CATEGORIES: readonly CategoryMeta[] = [
  { value: 'nature', label: 'طبيعة', hint: 'غابة، وادٍ، صحراء', icon: Leaf, group: 'nature' },
  { value: 'beach', label: 'شاطئ', hint: 'بحر، بحيرة، جزيرة', icon: Waves, group: 'nature' },
  {
    value: 'viewpoint',
    label: 'مطل',
    hint: 'إطلالة أو نقطة تصوير',
    icon: Binoculars,
    group: 'nature',
  },
  { value: 'park', label: 'حديقة', hint: 'متنزه أو محمية', icon: Trees, group: 'nature' },
  {
    value: 'historic',
    label: 'أثر تاريخي',
    hint: 'قلعة، بلدة قديمة',
    icon: ScrollText,
    group: 'culture',
  },
  { value: 'museum', label: 'متحف', hint: 'معرض أو دار عرض', icon: Landmark, group: 'culture' },
  {
    value: 'religious',
    label: 'مَعلم ديني',
    hint: 'مسجد أو مقام',
    icon: MoonStar,
    group: 'culture',
  },
  {
    value: 'culture',
    label: 'فنون',
    hint: 'مسرح، حرفة، موسيقى',
    icon: Paintbrush,
    group: 'culture',
  },
  { value: 'food', label: 'مطعم', hint: 'وجبة تستحق الرحلة', icon: Utensils, group: 'taste' },
  { value: 'cafe', label: 'مقهى', hint: 'قهوة، حلويات، جلسة', icon: Coffee, group: 'taste' },
  { value: 'market', label: 'سوق', hint: 'سوق شعبي أو متجر', icon: Store, group: 'taste' },
  {
    value: 'city',
    label: 'حيّ أو مدينة',
    hint: 'منطقة تستحق التجوّل',
    icon: Building,
    group: 'city',
  },
  { value: 'adventure', label: 'مغامرة', hint: 'تسلّق، غوص، مسار', icon: Mountain, group: 'city' },
  { value: 'stay', label: 'إقامة', hint: 'فندق، شاليه، مخيّم', icon: BedDouble, group: 'city' },
  { value: 'transport', label: 'محطة', hint: 'مطار، ميناء، قطار', icon: Bus, group: 'city' },
  { value: 'other', label: 'أخرى', hint: 'لا يناسبه تصنيف', icon: MapPin, group: 'city' },
] as const;

const CATEGORY_INDEX = new Map<PlaceCategory, CategoryMeta>(
  CATEGORIES.map((entry) => [entry.value, entry]),
);

const FALLBACK: CategoryMeta = {
  value: 'other',
  label: 'مكان',
  hint: '',
  icon: MapPin,
  group: 'city',
};

export function categoryMeta(category: PlaceCategory): CategoryMeta {
  return CATEGORY_INDEX.get(category) ?? FALLBACK;
}

export function categoryLabel(category: PlaceCategory): string {
  return categoryMeta(category).label;
}

export function categoryIcon(category: PlaceCategory): IconComponent {
  return categoryMeta(category).icon;
}

// ── Visit status ────────────────────────────────────────────────────────────
// The one documented colour key in the feature. Three semantic tokens, each
// carrying a real meaning rather than decoration:
//   visited  → success   (done)
//   planned  → live      (the app's single accent: "active now")
//   wishlist → muted     (not committed yet)

export interface VisitStatusMeta {
  value: VisitStatus;
  label: string;
  /** Verb used on the toggle button. */
  action: string;
  /** `hsl()` wrapper around a semantic token — safe for inline map styling. */
  color: string;
  icon: IconComponent;
}

export const VISIT_STATUS_META: readonly VisitStatusMeta[] = [
  {
    value: 'wishlist',
    label: 'قائمة الأمنيات',
    action: 'أريد زيارته',
    color: 'hsl(var(--muted-foreground))',
    icon: Compass,
  },
  {
    value: 'planned',
    label: 'مخطَّط له',
    action: 'مخطَّط له',
    color: 'hsl(var(--live))',
    icon: MapPin,
  },
  {
    value: 'visited',
    label: 'زرته',
    action: 'زرته',
    color: 'hsl(var(--success))',
    icon: Mountain,
  },
] as const;

const STATUS_INDEX = new Map<VisitStatus, VisitStatusMeta>(
  VISIT_STATUS_META.map((entry) => [entry.value, entry]),
);

export function visitStatusMeta(status: VisitStatus): VisitStatusMeta {
  return STATUS_INDEX.get(status) ?? VISIT_STATUS_META[0];
}

// ── Price level ─────────────────────────────────────────────────────────────

export const PRICE_LEVELS: readonly { value: number; label: string; glyph: string }[] = [
  { value: 0, label: 'بلا تكلفة', glyph: '—' },
  { value: 1, label: 'اقتصادي', glyph: '·' },
  { value: 2, label: 'متوسط', glyph: '··' },
  { value: 3, label: 'مرتفع', glyph: '···' },
  { value: 4, label: 'فخم', glyph: '····' },
] as const;

export function priceLevelLabel(level: number | null): string | null {
  if (level === null) return null;
  return PRICE_LEVELS.find((entry) => entry.value === level)?.label ?? null;
}

// ── Months ──────────────────────────────────────────────────────────────────

export const MONTH_LABELS: readonly string[] = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/** Two-letter month initials for the 12-cell season strip. */
export const MONTH_SHORT: readonly string[] = [
  'ينا',
  'فبر',
  'مار',
  'أبر',
  'ماي',
  'يون',
  'يول',
  'أغس',
  'سبت',
  'أكت',
  'نوف',
  'ديس',
];

/** "مارس · أبريل · مايو" — or a range when the months are consecutive. */
export function formatMonths(months: number[]): string | null {
  if (months.length === 0) return null;
  if (months.length === 12) return 'طوال العام';
  const sorted = [...months].sort((a, b) => a - b);
  const consecutive = sorted.every(
    (month, index) => index === 0 || month === sorted[index - 1] + 1,
  );
  if (consecutive && sorted.length > 2) {
    return `${MONTH_LABELS[sorted[0] - 1]} — ${MONTH_LABELS[sorted[sorted.length - 1] - 1]}`;
  }
  return sorted.map((month) => MONTH_LABELS[month - 1]).join(' · ');
}

/** "٣ ساعات" / "يوم كامل" — duration read the way a traveller plans it. */
export function formatDuration(minutes: number | null): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} دقيقة`;
  if (minutes < 60 * 24) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    if (hours === 1) return 'ساعة';
    if (hours === 2) return 'ساعتان';
    return `${hours} ساعات`;
  }
  const days = Math.round(minutes / (60 * 24));
  if (days === 1) return 'يوم كامل';
  if (days === 2) return 'يومان';
  return `${days} أيام`;
}
