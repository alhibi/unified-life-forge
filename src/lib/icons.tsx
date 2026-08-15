/**
 * Centralized icon module — swappable icon libraries.
 * ---------------------------------------------------------------------------
 * The app supports THREE full icon libraries the user can switch between from
 * Appearance settings. Each library has a genuinely different personality:
 *
 *   • phosphor — refined, rounded, editorial (default)
 *   • lucide   — clean, geometric, technical
 *   • tabler   — expressive, hand-drawn feel, distinctive
 *
 * A single React context (`useIconSet`) tells every icon which library to
 * render. Names, sizes, and stroke weights stay identical — only the glyph
 * geometry changes, so the whole product feels like it slipped into a
 * different visual family the moment the user picks a new set.
 *
 * Every export accepts the legacy lucide-style props (`className`, `size`,
 * `strokeWidth`, `fill`, `weight`) and adapts them per-library so existing
 * call sites keep working unchanged.
 */
import * as PhosMod from '@phosphor-icons/react';
import { type Icon as PhosphorIcon, IconContext, type IconProps } from '@phosphor-icons/react';
import {
  createContext,
  type FC,
  forwardRef,
  type ReactNode,
  type SVGProps,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useApp } from '@/contexts/AppContext';

export type IconSet = 'phosphor' | 'lucide' | 'tabler';

/* ------------------------------------------------------------------------- */
/*  Context + persistence                                                     */
/* ------------------------------------------------------------------------- */

const STORAGE_KEY = 'app-icon-set';
const VALID: readonly IconSet[] = ['phosphor', 'lucide', 'tabler'];

/** Retired sets keep working: map them onto the closest surviving family. */
const ICON_SET_ALIASES: Record<string, IconSet> = { hugeicons: 'tabler' };

function normalizeSet(value: string | null | undefined): IconSet | null {
  if (!value) return null;
  if ((VALID as readonly string[]).includes(value)) return value as IconSet;
  return ICON_SET_ALIASES[value] ?? null;
}

function readStored(): IconSet {
  if (typeof window === 'undefined') return 'phosphor';
  try {
    return normalizeSet(window.localStorage.getItem(STORAGE_KEY)) ?? 'phosphor';
  } catch {
    return 'phosphor';
  }
}

const CHANGE_EVENT = 'app-icon-set:change';
const IconSetContext = createContext<IconSet>('phosphor');
/** Bumped whenever a lazily-loaded icon library finishes downloading. */
const IconLibVersionContext = createContext(0);

export function useIconSet(): IconSet {
  return useContext(IconSetContext);
}

/** Exposed so a subtree (e.g. previews) can force-render icons in another set. */
export const IconSetOverride = IconSetContext.Provider;

/**
 * Change the active icon library. Writes to localStorage and broadcasts a
 * DOM event so every mounted `IconProvider` re-renders immediately without
 * plumbing setters through half a dozen contexts.
 */
export function setIconSet(input: IconSet): void {
  const next = normalizeSet(input);
  if (!next) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Non-fatal: the in-memory context still updates below.
  }
  window.dispatchEvent(new CustomEvent<IconSet>(CHANGE_EVENT, { detail: next }));
}

export function readIconSet(): IconSet {
  return readStored();
}

/* ------------------------------------------------------------------------- */
/*  Type + prop helpers                                                       */
/* ------------------------------------------------------------------------- */

export type { Icon as LucideIcon } from '@phosphor-icons/react';
export type IconComponent = PhosphorIcon;

export const ICON_WEIGHT: NonNullable<IconProps['weight']> = 'regular';
export const ICON_DEFAULT_SIZE = 24;

export type IconComponentProps = Omit<IconProps, 'weight'> & {
  weight?: IconProps['weight'];
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

type Names = { p: string; l: string; t: string };

const PhosLib = PhosMod as unknown as Record<string, PhosphorIcon | undefined>;

/**
 * The three alternate libraries used to be static namespace imports. Together
 * they weigh ~11 MB of JavaScript, and because this module is imported by the
 * app shell they landed in the ENTRY chunk — every first paint downloaded and
 * parsed all four icon libraries, which blanked the app on mobile (the tab is
 * killed before React ever mounts).
 *
 * They are now loaded on demand: phosphor (the default, and the fallback for
 * any missing glyph) stays static, and the selected alternate library is
 * fetched once, cached here, and announced so mounted icons re-render.
 */
type StrokeLib = Record<string, FC<SVGProps<SVGSVGElement> & { strokeWidth?: number }> | undefined>;
type TablerLibType = Record<string, FC<SVGProps<SVGSVGElement> & { stroke?: number }> | undefined>;

const EMPTY: StrokeLib = {};
let LucideLib: StrokeLib = EMPTY;
let TablerLib: TablerLibType = {};

const LOADED_EVENT = 'app-icon-set:loaded';
const loading = new Set<IconSet>();

/** Fetch the module backing `set` (no-op for phosphor / already loaded). */
export function loadIconSet(set: IconSet): void {
  if (set === 'phosphor' || loading.has(set)) return;
  loading.add(set);
  const done = () => window.dispatchEvent(new CustomEvent(LOADED_EVENT));
  if (set === 'lucide') {
    void import('lucide-react').then((m) => {
      LucideLib = m as unknown as StrokeLib;
      done();
    });
  } else if (set === 'tabler') {
    void import('@tabler/icons-react').then((m) => {
      TablerLib = m as unknown as TablerLibType;
      done();
    });
  }
}


/**
 * Every alias in this file is name-verified against all three libraries by
 * `src/lib/__tests__/iconCoverage.test.ts`, so a lookup is a single hit in the
 * selected library. The only fallback left is phosphor, and it exists purely
 * for brand marks that a stroke library does not ship at all (e.g. GitHub) —
 * never for ordinary UI glyphs, which is what used to make one set silently
 * render a mix of two families.
 */
const resolveCache: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

function pickComponent(set: IconSet, names: Names) {
  const key = `${set}:${names.p}`;
  const cached = resolveCache[key];
  if (cached !== undefined) return cached as PhosphorIcon;

  const found =
    set === 'lucide' ? (LucideLib[names.l] ?? PhosLib[names.p])
    : set === 'tabler' ? (TablerLib[names.t] ?? PhosLib[names.p])
    : PhosLib[names.p];

  // Only memoize once the chosen library is actually in memory, otherwise the
  // phosphor placeholder would be cached forever.
  const libReady =
    set === 'phosphor' ||
    (set === 'lucide' && LucideLib !== EMPTY) ||
    (set === 'tabler' && Object.keys(TablerLib).length > 0);
  if (libReady && found) resolveCache[key] = found;
  return found as PhosphorIcon | undefined;
}

/* ------------------------------------------------------------------------- */
/*  IconSlot — the single wrapper every exported icon delegates to            */
/* ------------------------------------------------------------------------- */

interface SlotProps extends IconComponentProps {
  names: Names;
}

const IconSlot = forwardRef<SVGSVGElement, SlotProps>(function IconSlot(
  { names, fill, weight, strokeWidth, absoluteStrokeWidth: _abs, ...rest },
  ref,
) {
  const set = useIconSet();
  // Subscribing keeps every icon in sync with the on-demand library load.
  useContext(IconLibVersionContext);
  const Comp = pickComponent(set, names);
  if (!Comp) return null;

  const isSolid = fill != null && fill !== 'none' && fill !== 'transparent';

  if (set === 'phosphor') {
    const P = Comp as PhosphorIcon;
    return (
      <P
        ref={ref}
        weight={weight ?? (isSolid ? 'fill' : 'duotone')}
        // Phosphor accepts a color prop, not a stroke number.
        {...(rest as unknown as IconProps)}
      />
    );
  }

  // lucide + tabler both use SVG stroke props. Map `weight` → strokeWidth
  // roughly so the "bold" motion setting still feels heavier.
  const strokeFromWeight =
    weight === 'bold' || weight === 'fill' ? 2.4
    : weight === 'light' || weight === 'thin' ? 1.4
    : undefined;
  const stroke =
    typeof strokeWidth === 'number' ? strokeWidth
    : typeof strokeWidth === 'string' ? Number.parseFloat(strokeWidth)
    : strokeFromWeight;

  const strokeNum = typeof stroke === 'number' && Number.isFinite(stroke) ? stroke : undefined;
  const extra: Record<string, unknown> = {
    ref,
    ...(isSolid ? { fill: 'currentColor' } : {}),
    ...(rest as Record<string, unknown>),
  };
  if (set === 'tabler') {
    // Airy, hand-drawn feel that reads as *tabler* at a glance.
    extra.stroke = strokeNum ?? 1.5;
  } else {
    // Lucide — geometric and technical.
    extra.strokeWidth = strokeNum ?? 2;
  }
  const Any = Comp as unknown as FC<Record<string, unknown>>;
  return <Any {...extra} />;
});

/* ------------------------------------------------------------------------- */
/*  IconProvider — reads live iconSet from AppContext + storage broadcasts    */
/* ------------------------------------------------------------------------- */

export function IconProvider({ children }: { children: ReactNode }) {
  const { interactionStyle } = useApp();
  const weight: NonNullable<IconProps['weight']> =
    interactionStyle === 'lively' ? 'bold' : ICON_WEIGHT;

  const [set, setSet] = useState<IconSet>(() => readStored());
  const [libVersion, setLibVersion] = useState(0);

  // Pull in the selected library after first paint; phosphor renders in the
  // meantime so nothing is ever missing on screen.
  useEffect(() => {
    loadIconSet(set);
  }, [set]);

  useEffect(() => {
    const onLoaded = () => setLibVersion((v) => v + 1);
    window.addEventListener(LOADED_EVENT, onLoaded);
    return () => window.removeEventListener(LOADED_EVENT, onLoaded);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = normalizeSet((event as CustomEvent<IconSet>).detail);
      if (detail) setSet(detail);
      else setSet(readStored());
    };
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-icon-set', set);
  }, [set]);

  return (
    <IconContext.Provider value={{ weight, size: ICON_DEFAULT_SIZE, color: 'currentColor' }}>
      <IconLibVersionContext.Provider value={libVersion}>
        <IconSetContext.Provider value={set}>{children}</IconSetContext.Provider>
      </IconLibVersionContext.Provider>
    </IconContext.Provider>
  );
}

/* ------------------------------------------------------------------------- */
/*  Public icon exports — 221 aliases sharing the codebase's legacy names     */
/* ------------------------------------------------------------------------- */
export const ALargeSmall = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ALargeSmall(props, ref) { return <IconSlot ref={ref} names={{ p: 'TextAa', l: 'ALargeSmall', t: 'IconTextSize' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Activity = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Activity(props, ref) { return <IconSlot ref={ref} names={{ p: 'Pulse', l: 'Activity', t: 'IconActivity' }} {...props} />; },
) as unknown as PhosphorIcon;
export const AlertCircle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function AlertCircle(props, ref) { return <IconSlot ref={ref} names={{ p: 'WarningCircle', l: 'AlertCircle', t: 'IconAlertCircle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const AlertTriangle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function AlertTriangle(props, ref) { return <IconSlot ref={ref} names={{ p: 'Warning', l: 'AlertTriangle', t: 'IconAlertTriangle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Apple = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Apple(props, ref) { return <IconSlot ref={ref} names={{ p: 'AppleLogo', l: 'Apple', t: 'IconApple' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Archive = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Archive(props, ref) { return <IconSlot ref={ref} names={{ p: 'Archive', l: 'Archive', t: 'IconArchive' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArchiveRestore = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArchiveRestore(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowUUpLeft', l: 'ArchiveRestore', t: 'IconArchiveOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowDown = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowDown(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowDown', l: 'ArrowDown', t: 'IconArrowDown' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowDownAZ = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowDownAZ(props, ref) { return <IconSlot ref={ref} names={{ p: 'SortAscending', l: 'ArrowDownAZ', t: 'IconSortAscendingLetters' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowDownNarrowWide = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowDownNarrowWide(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowsDownUp', l: 'ArrowDownNarrowWide', t: 'IconSortAscending' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowDownWideNarrow = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowDownWideNarrow(props, ref) { return <IconSlot ref={ref} names={{ p: 'SortDescending', l: 'ArrowDownWideNarrow', t: 'IconSortDescending' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowLeft = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowLeft(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowLeft', l: 'ArrowLeft', t: 'IconArrowLeft' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowLeftRight = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowLeftRight(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowsLeftRight', l: 'ArrowLeftRight', t: 'IconArrowsLeftRight' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowRight = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowRight(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowRight', l: 'ArrowRight', t: 'IconArrowRight' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowUp = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowUp(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowUp', l: 'ArrowUp', t: 'IconArrowUp' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowUpNarrowWide = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowUpNarrowWide(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowLineUp', l: 'ArrowUpNarrowWide', t: 'IconSortAscending2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowUpSquare = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowUpSquare(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowSquareUp', l: 'ArrowUpSquare', t: 'IconSquareArrowUp' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ArrowUpWideNarrow = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ArrowUpWideNarrow(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowLineDown', l: 'ArrowUpWideNarrow', t: 'IconSortDescending2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Award = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Award(props, ref) { return <IconSlot ref={ref} names={{ p: 'Medal', l: 'Award', t: 'IconAward' }} {...props} />; },
) as unknown as PhosphorIcon;
export const BarChart3 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function BarChart3(props, ref) { return <IconSlot ref={ref} names={{ p: 'ChartBar', l: 'BarChart3', t: 'IconChartBar' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Bean = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Bean(props, ref) { return <IconSlot ref={ref} names={{ p: 'BowlSteam', l: 'Bean', t: 'IconBowlSpoon' }} {...props} />; },
) as unknown as PhosphorIcon;
export const BedDouble = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function BedDouble(props, ref) { return <IconSlot ref={ref} names={{ p: 'Bed', l: 'BedDouble', t: 'IconBedFlat' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Beef = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Beef(props, ref) { return <IconSlot ref={ref} names={{ p: 'Cow', l: 'Beef', t: 'IconMeat' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Bell = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Bell(props, ref) { return <IconSlot ref={ref} names={{ p: 'Bell', l: 'Bell', t: 'IconBell' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Backspace = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Backspace(props, ref) { return <IconSlot ref={ref} names={{ p: 'Backspace', l: 'Delete', t: 'IconBackspace' }} {...props} />; },
) as unknown as PhosphorIcon;
export const BellOff = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function BellOff(props, ref) { return <IconSlot ref={ref} names={{ p: 'BellSlash', l: 'BellOff', t: 'IconBellOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const BellRing = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function BellRing(props, ref) { return <IconSlot ref={ref} names={{ p: 'BellRinging', l: 'BellRing', t: 'IconBellRinging' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Binoculars = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Binoculars(props, ref) { return <IconSlot ref={ref} names={{ p: 'Binoculars', l: 'Binoculars', t: 'IconBinoculars' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Bold = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Bold(props, ref) { return <IconSlot ref={ref} names={{ p: 'TextB', l: 'Bold', t: 'IconBold' }} {...props} />; },
) as unknown as PhosphorIcon;
export const BookMarked = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function BookMarked(props, ref) { return <IconSlot ref={ref} names={{ p: 'BookBookmark', l: 'BookMarked', t: 'IconBookmarks' }} {...props} />; },
) as unknown as PhosphorIcon;
export const BookOpen = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function BookOpen(props, ref) { return <IconSlot ref={ref} names={{ p: 'BookOpen', l: 'BookOpen', t: 'IconBook2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Bookmark = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Bookmark(props, ref) { return <IconSlot ref={ref} names={{ p: 'BookmarkSimple', l: 'Bookmark', t: 'IconBookmark' }} {...props} />; },
) as unknown as PhosphorIcon;
export const BookmarkCheck = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function BookmarkCheck(props, ref) { return <IconSlot ref={ref} names={{ p: 'Bookmarks', l: 'BookmarkCheck', t: 'IconBookmarkFilled' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Bot = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Bot(props, ref) { return <IconSlot ref={ref} names={{ p: 'Robot', l: 'Bot', t: 'IconRobot' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Brain = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Brain(props, ref) { return <IconSlot ref={ref} names={{ p: 'Brain', l: 'Brain', t: 'IconBrain' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Building = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Building(props, ref) { return <IconSlot ref={ref} names={{ p: 'Buildings', l: 'Building', t: 'IconBuilding' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Bus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Bus(props, ref) { return <IconSlot ref={ref} names={{ p: 'Bus', l: 'Bus', t: 'IconBus' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Calculator = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Calculator(props, ref) { return <IconSlot ref={ref} names={{ p: 'Calculator', l: 'Calculator', t: 'IconCalculator' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Calendar = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Calendar(props, ref) { return <IconSlot ref={ref} names={{ p: 'Calendar', l: 'Calendar', t: 'IconCalendar' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CalendarDays = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CalendarDays(props, ref) { return <IconSlot ref={ref} names={{ p: 'CalendarDots', l: 'CalendarDays', t: 'IconCalendarWeek' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CalendarIcon = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CalendarIcon(props, ref) { return <IconSlot ref={ref} names={{ p: 'Calendar', l: 'CalendarIcon', t: 'IconCalendarMonth' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Camera = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Camera(props, ref) { return <IconSlot ref={ref} names={{ p: 'Camera', l: 'Camera', t: 'IconCamera' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Car = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Car(props, ref) { return <IconSlot ref={ref} names={{ p: 'Car', l: 'Car', t: 'IconCar' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Carrot = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Carrot(props, ref) { return <IconSlot ref={ref} names={{ p: 'Carrot', l: 'Carrot', t: 'IconCarrot' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Check = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Check(props, ref) { return <IconSlot ref={ref} names={{ p: 'Check', l: 'Check', t: 'IconCheck' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CheckCheck = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CheckCheck(props, ref) { return <IconSlot ref={ref} names={{ p: 'Checks', l: 'CheckCheck', t: 'IconChecks' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CheckCircle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CheckCircle(props, ref) { return <IconSlot ref={ref} names={{ p: 'CheckCircle', l: 'CheckCircle', t: 'IconCircleCheck' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CheckCircle2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CheckCircle2(props, ref) { return <IconSlot ref={ref} names={{ p: 'CheckCircle', l: 'CheckCircle2', t: 'IconCircleCheckFilled' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Cherry = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Cherry(props, ref) { return <IconSlot ref={ref} names={{ p: 'Cherries', l: 'Cherry', t: 'IconCherry' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ChevronDown = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ChevronDown(props, ref) { return <IconSlot ref={ref} names={{ p: 'CaretDown', l: 'ChevronDown', t: 'IconChevronDown' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ChevronLeft = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ChevronLeft(props, ref) { return <IconSlot ref={ref} names={{ p: 'CaretLeft', l: 'ChevronLeft', t: 'IconChevronLeft' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ChevronRight = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ChevronRight(props, ref) { return <IconSlot ref={ref} names={{ p: 'CaretRight', l: 'ChevronRight', t: 'IconChevronRight' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ChevronUp = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ChevronUp(props, ref) { return <IconSlot ref={ref} names={{ p: 'CaretUp', l: 'ChevronUp', t: 'IconChevronUp' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ChevronsDown = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ChevronsDown(props, ref) { return <IconSlot ref={ref} names={{ p: 'CaretDoubleDown', l: 'ChevronsDown', t: 'IconChevronsDown' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ChevronsUp = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ChevronsUp(props, ref) { return <IconSlot ref={ref} names={{ p: 'CaretDoubleUp', l: 'ChevronsUp', t: 'IconChevronsUp' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Circle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Circle(props, ref) { return <IconSlot ref={ref} names={{ p: 'Circle', l: 'Circle', t: 'IconCircle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CircleCheck = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CircleCheck(props, ref) { return <IconSlot ref={ref} names={{ p: 'CheckCircle', l: 'CircleCheck', t: 'IconCircleCheck' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Citrus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Citrus(props, ref) { return <IconSlot ref={ref} names={{ p: 'Orange', l: 'Citrus', t: 'IconLemon2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Clipboard = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Clipboard(props, ref) { return <IconSlot ref={ref} names={{ p: 'Clipboard', l: 'Clipboard', t: 'IconClipboard' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ClipboardCopy = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ClipboardCopy(props, ref) { return <IconSlot ref={ref} names={{ p: 'ClipboardText', l: 'ClipboardCopy', t: 'IconClipboardCopy' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Clock = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Clock(props, ref) { return <IconSlot ref={ref} names={{ p: 'Clock', l: 'Clock', t: 'IconClock' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Cloud = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Cloud(props, ref) { return <IconSlot ref={ref} names={{ p: 'Cloud', l: 'Cloud', t: 'IconCloud' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CloudDrizzle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CloudDrizzle(props, ref) { return <IconSlot ref={ref} names={{ p: 'Umbrella', l: 'CloudDrizzle', t: 'IconUmbrella' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CloudFog = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CloudFog(props, ref) { return <IconSlot ref={ref} names={{ p: 'CloudFog', l: 'CloudFog', t: 'IconCloudFog' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CloudLightning = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CloudLightning(props, ref) { return <IconSlot ref={ref} names={{ p: 'CloudLightning', l: 'CloudLightning', t: 'IconCloudBolt' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CloudRain = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CloudRain(props, ref) { return <IconSlot ref={ref} names={{ p: 'CloudRain', l: 'CloudRain', t: 'IconCloudRain' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CloudSnow = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CloudSnow(props, ref) { return <IconSlot ref={ref} names={{ p: 'CloudSnow', l: 'CloudSnow', t: 'IconCloudSnow' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CloudSun = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CloudSun(props, ref) { return <IconSlot ref={ref} names={{ p: 'CloudSun', l: 'CloudSun', t: 'IconSunWind' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Cloudy = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Cloudy(props, ref) { return <IconSlot ref={ref} names={{ p: 'Cloud', l: 'Cloudy', t: 'IconCloudFilled' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Coffee = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Coffee(props, ref) { return <IconSlot ref={ref} names={{ p: 'Coffee', l: 'Coffee', t: 'IconCoffee' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Compass = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Compass(props, ref) { return <IconSlot ref={ref} names={{ p: 'Compass', l: 'Compass', t: 'IconCompass' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Contrast = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Contrast(props, ref) { return <IconSlot ref={ref} names={{ p: 'CircleHalf', l: 'Contrast', t: 'IconContrast' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Cookie = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Cookie(props, ref) { return <IconSlot ref={ref} names={{ p: 'Cookie', l: 'Cookie', t: 'IconCookie' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Copy = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Copy(props, ref) { return <IconSlot ref={ref} names={{ p: 'Copy', l: 'Copy', t: 'IconCopy' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CornerDownLeft = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CornerDownLeft(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowElbowDownLeft', l: 'CornerDownLeft', t: 'IconCornerDownLeft' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Crosshair = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Crosshair(props, ref) { return <IconSlot ref={ref} names={{ p: 'Crosshair', l: 'Crosshair', t: 'IconCrosshair' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Crown = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Crown(props, ref) { return <IconSlot ref={ref} names={{ p: 'Crown', l: 'Crown', t: 'IconCrown' }} {...props} />; },
) as unknown as PhosphorIcon;
export const CupSoda = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function CupSoda(props, ref) { return <IconSlot ref={ref} names={{ p: 'PintGlass', l: 'CupSoda', t: 'IconCup' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Database = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Database(props, ref) { return <IconSlot ref={ref} names={{ p: 'Database', l: 'Database', t: 'IconDatabase' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Dices = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Dices(props, ref) { return <IconSlot ref={ref} names={{ p: 'DiceFive', l: 'Dices', t: 'IconDice5' }} {...props} />; },
) as unknown as PhosphorIcon;
export const DoorOpen = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function DoorOpen(props, ref) { return <IconSlot ref={ref} names={{ p: 'DoorOpen', l: 'DoorOpen', t: 'IconDoorEnter' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Download = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Download(props, ref) { return <IconSlot ref={ref} names={{ p: 'DownloadSimple', l: 'Download', t: 'IconDownload' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Droplet = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Droplet(props, ref) { return <IconSlot ref={ref} names={{ p: 'Drop', l: 'Droplet', t: 'IconDroplet' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Droplets = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Droplets(props, ref) { return <IconSlot ref={ref} names={{ p: 'DropHalf', l: 'Droplets', t: 'IconDroplets' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Dumbbell = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Dumbbell(props, ref) { return <IconSlot ref={ref} names={{ p: 'Barbell', l: 'Dumbbell', t: 'IconDumbbell' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Egg = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Egg(props, ref) { return <IconSlot ref={ref} names={{ p: 'Egg', l: 'Egg', t: 'IconEgg' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Eraser = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Eraser(props, ref) { return <IconSlot ref={ref} names={{ p: 'Eraser', l: 'Eraser', t: 'IconEraser' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ExternalLink = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ExternalLink(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowSquareOut', l: 'ExternalLink', t: 'IconExternalLink' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Eye = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Eye(props, ref) { return <IconSlot ref={ref} names={{ p: 'Eye', l: 'Eye', t: 'IconEye' }} {...props} />; },
) as unknown as PhosphorIcon;
export const EyeOff = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function EyeOff(props, ref) { return <IconSlot ref={ref} names={{ p: 'EyeSlash', l: 'EyeOff', t: 'IconEyeOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Feather = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Feather(props, ref) { return <IconSlot ref={ref} names={{ p: 'Feather', l: 'Feather', t: 'IconFeather' }} {...props} />; },
) as unknown as PhosphorIcon;
export const FileText = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function FileText(props, ref) { return <IconSlot ref={ref} names={{ p: 'FileText', l: 'FileText', t: 'IconFileText' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Filter = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Filter(props, ref) { return <IconSlot ref={ref} names={{ p: 'Funnel', l: 'Filter', t: 'IconFilter' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Fish = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Fish(props, ref) { return <IconSlot ref={ref} names={{ p: 'Fish', l: 'Fish', t: 'IconFish' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Flag = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Flag(props, ref) { return <IconSlot ref={ref} names={{ p: 'Flag', l: 'Flag', t: 'IconFlag' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Flame = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Flame(props, ref) { return <IconSlot ref={ref} names={{ p: 'Flame', l: 'Flame', t: 'IconFlame' }} {...props} />; },
) as unknown as PhosphorIcon;
export const FlaskConical = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function FlaskConical(props, ref) { return <IconSlot ref={ref} names={{ p: 'Flask', l: 'FlaskConical', t: 'IconFlask2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const FolderOpen = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function FolderOpen(props, ref) { return <IconSlot ref={ref} names={{ p: 'FolderOpen', l: 'FolderOpen', t: 'IconFolderOpen' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Forward = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Forward(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowBendUpRight', l: 'Forward', t: 'IconArrowForwardUp' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Gamepad2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Gamepad2(props, ref) { return <IconSlot ref={ref} names={{ p: 'GameController', l: 'Gamepad2', t: 'IconDeviceGamepad2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Gauge = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Gauge(props, ref) { return <IconSlot ref={ref} names={{ p: 'Gauge', l: 'Gauge', t: 'IconGauge' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Github = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Github(props, ref) { return <IconSlot ref={ref} names={{ p: 'GithubLogo', l: 'Github', t: 'IconBrandGithub' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Globe = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Globe(props, ref) { return <IconSlot ref={ref} names={{ p: 'Globe', l: 'Globe', t: 'IconGlobe' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Grid3X3 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Grid3X3(props, ref) { return <IconSlot ref={ref} names={{ p: 'GridNine', l: 'Grid3X3', t: 'IconGrid3x3' }} {...props} />; },
) as unknown as PhosphorIcon;
export const HandHeart = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function HandHeart(props, ref) { return <IconSlot ref={ref} names={{ p: 'HandHeart', l: 'HandHeart', t: 'IconHeartHandshake' }} {...props} />; },
) as unknown as PhosphorIcon;
export const HardDrive = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function HardDrive(props, ref) { return <IconSlot ref={ref} names={{ p: 'HardDrive', l: 'HardDrive', t: 'IconDeviceSdCard' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Hash = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Hash(props, ref) { return <IconSlot ref={ref} names={{ p: 'Hash', l: 'Hash', t: 'IconHash' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Heart = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Heart(props, ref) { return <IconSlot ref={ref} names={{ p: 'Heart', l: 'Heart', t: 'IconHeart' }} {...props} />; },
) as unknown as PhosphorIcon;
export const HelpCircle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function HelpCircle(props, ref) { return <IconSlot ref={ref} names={{ p: 'Question', l: 'HelpCircle', t: 'IconHelpCircle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const History = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function History(props, ref) { return <IconSlot ref={ref} names={{ p: 'ClockCounterClockwise', l: 'History', t: 'IconHistory' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Home = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Home(props, ref) { return <IconSlot ref={ref} names={{ p: 'House', l: 'Home', t: 'IconHome' }} {...props} />; },
) as unknown as PhosphorIcon;
export const House = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function House(props, ref) { return <IconSlot ref={ref} names={{ p: 'House', l: 'House', t: 'IconHome2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Image = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Image(props, ref) { return <IconSlot ref={ref} names={{ p: 'Image', l: 'Image', t: 'IconPhoto' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ImageIcon = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ImageIcon(props, ref) { return <IconSlot ref={ref} names={{ p: 'Image', l: 'ImageIcon', t: 'IconPhoto' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ImageOff = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ImageOff(props, ref) { return <IconSlot ref={ref} names={{ p: 'ImageBroken', l: 'ImageOff', t: 'IconPhotoOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ImagePlus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ImagePlus(props, ref) { return <IconSlot ref={ref} names={{ p: 'ImageSquare', l: 'ImagePlus', t: 'IconPhotoPlus' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Info = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Info(props, ref) { return <IconSlot ref={ref} names={{ p: 'Info', l: 'Info', t: 'IconInfoCircle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Key = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Key(props, ref) { return <IconSlot ref={ref} names={{ p: 'Key', l: 'Key', t: 'IconKey' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Keyboard = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Keyboard(props, ref) { return <IconSlot ref={ref} names={{ p: 'Keyboard', l: 'Keyboard', t: 'IconKeyboard' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Landmark = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Landmark(props, ref) { return <IconSlot ref={ref} names={{ p: 'Bank', l: 'Landmark', t: 'IconBuildingBank' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Languages = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Languages(props, ref) { return <IconSlot ref={ref} names={{ p: 'Translate', l: 'Languages', t: 'IconLanguage' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Layers = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Layers(props, ref) { return <IconSlot ref={ref} names={{ p: 'Stack', l: 'Layers', t: 'IconStack2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const LayoutGrid = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function LayoutGrid(props, ref) { return <IconSlot ref={ref} names={{ p: 'SquaresFour', l: 'LayoutGrid', t: 'IconLayoutGrid' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Leaf = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Leaf(props, ref) { return <IconSlot ref={ref} names={{ p: 'Leaf', l: 'Leaf', t: 'IconLeaf' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Library = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Library(props, ref) { return <IconSlot ref={ref} names={{ p: 'Books', l: 'Library', t: 'IconLibrary' }} {...props} />; },
) as unknown as PhosphorIcon;
export const LibraryBig = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function LibraryBig(props, ref) { return <IconSlot ref={ref} names={{ p: 'BookOpenText', l: 'LibraryBig', t: 'IconBooks' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Lightbulb = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Lightbulb(props, ref) { return <IconSlot ref={ref} names={{ p: 'Lightbulb', l: 'Lightbulb', t: 'IconBulb' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Link2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Link2(props, ref) { return <IconSlot ref={ref} names={{ p: 'Link', l: 'Link2', t: 'IconLink' }} {...props} />; },
) as unknown as PhosphorIcon;
export const List = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function List(props, ref) { return <IconSlot ref={ref} names={{ p: 'List', l: 'List', t: 'IconList' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ListMusic = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ListMusic(props, ref) { return <IconSlot ref={ref} names={{ p: 'Playlist', l: 'ListMusic', t: 'IconPlaylist' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ListPlus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ListPlus(props, ref) { return <IconSlot ref={ref} names={{ p: 'ListPlus', l: 'ListPlus', t: 'IconListDetails' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Loader = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Loader(props, ref) { return <IconSlot ref={ref} names={{ p: 'SpinnerGap', l: 'Loader', t: 'IconLoader' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Loader2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Loader2(props, ref) { return <IconSlot ref={ref} names={{ p: 'CircleNotch', l: 'Loader2', t: 'IconLoader2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Lock = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Lock(props, ref) { return <IconSlot ref={ref} names={{ p: 'Lock', l: 'Lock', t: 'IconLock' }} {...props} />; },
) as unknown as PhosphorIcon;
export const LogIn = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function LogIn(props, ref) { return <IconSlot ref={ref} names={{ p: 'SignIn', l: 'LogIn', t: 'IconLogin' }} {...props} />; },
) as unknown as PhosphorIcon;
export const LogOut = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function LogOut(props, ref) { return <IconSlot ref={ref} names={{ p: 'SignOut', l: 'LogOut', t: 'IconLogout' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Luggage = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Luggage(props, ref) { return <IconSlot ref={ref} names={{ p: 'SuitcaseRolling', l: 'Luggage', t: 'IconLuggage' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Map = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Map(props, ref) { return <IconSlot ref={ref} names={{ p: 'MapTrifold', l: 'Map', t: 'IconMap' }} {...props} />; },
) as unknown as PhosphorIcon;
export const MapPin = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function MapPin(props, ref) { return <IconSlot ref={ref} names={{ p: 'MapPin', l: 'MapPin', t: 'IconMapPin' }} {...props} />; },
) as unknown as PhosphorIcon;
export const MapPinned = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function MapPinned(props, ref) { return <IconSlot ref={ref} names={{ p: 'MapPinArea', l: 'MapPinned', t: 'IconMapPinFilled' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Maximize2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Maximize2(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowsOut', l: 'Maximize2', t: 'IconArrowsMaximize' }} {...props} />; },
) as unknown as PhosphorIcon;
export const MessageCircle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function MessageCircle(props, ref) { return <IconSlot ref={ref} names={{ p: 'ChatCircle', l: 'MessageCircle', t: 'IconMessageCircle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const MessageSquareText = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function MessageSquareText(props, ref) { return <IconSlot ref={ref} names={{ p: 'ChatText', l: 'MessageSquareText', t: 'IconMessage2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Mic = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Mic(props, ref) { return <IconSlot ref={ref} names={{ p: 'Microphone', l: 'Mic', t: 'IconMicrophone' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Milk = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Milk(props, ref) { return <IconSlot ref={ref} names={{ p: 'Cheese', l: 'Milk', t: 'IconMilk' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Minus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Minus(props, ref) { return <IconSlot ref={ref} names={{ p: 'Minus', l: 'Minus', t: 'IconMinus' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Moon = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Moon(props, ref) { return <IconSlot ref={ref} names={{ p: 'Moon', l: 'Moon', t: 'IconMoon' }} {...props} />; },
) as unknown as PhosphorIcon;
export const MoonStar = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function MoonStar(props, ref) { return <IconSlot ref={ref} names={{ p: 'MoonStars', l: 'MoonStar', t: 'IconMoonStars' }} {...props} />; },
) as unknown as PhosphorIcon;
export const MoreHorizontal = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function MoreHorizontal(props, ref) { return <IconSlot ref={ref} names={{ p: 'DotsThree', l: 'MoreHorizontal', t: 'IconDots' }} {...props} />; },
) as unknown as PhosphorIcon;
export const MoreVertical = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function MoreVertical(props, ref) { return <IconSlot ref={ref} names={{ p: 'DotsThreeVertical', l: 'MoreVertical', t: 'IconDotsVertical' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Mountain = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Mountain(props, ref) { return <IconSlot ref={ref} names={{ p: 'Mountains', l: 'Mountain', t: 'IconMountain' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Music = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Music(props, ref) { return <IconSlot ref={ref} names={{ p: 'MusicNotes', l: 'Music', t: 'IconMusic' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Navigation = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Navigation(props, ref) { return <IconSlot ref={ref} names={{ p: 'NavigationArrow', l: 'Navigation', t: 'IconNavigation' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Network = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Network(props, ref) { return <IconSlot ref={ref} names={{ p: 'Graph', l: 'Network', t: 'IconNetwork' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Newspaper = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Newspaper(props, ref) { return <IconSlot ref={ref} names={{ p: 'Newspaper', l: 'Newspaper', t: 'IconNews' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Nut = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Nut(props, ref) { return <IconSlot ref={ref} names={{ p: 'Nut', l: 'Nut', t: 'IconNut' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Paintbrush = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Paintbrush(props, ref) { return <IconSlot ref={ref} names={{ p: 'PaintBrush', l: 'Paintbrush', t: 'IconBrush' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Palette = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Palette(props, ref) { return <IconSlot ref={ref} names={{ p: 'Palette', l: 'Palette', t: 'IconPalette' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Pause = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Pause(props, ref) { return <IconSlot ref={ref} names={{ p: 'Pause', l: 'Pause', t: 'IconPlayerPause' }} {...props} />; },
) as unknown as PhosphorIcon;
export const PenLine = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function PenLine(props, ref) { return <IconSlot ref={ref} names={{ p: 'PencilSimpleLine', l: 'PenLine', t: 'IconWriting' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Pencil = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Pencil(props, ref) { return <IconSlot ref={ref} names={{ p: 'PencilSimple', l: 'Pencil', t: 'IconPencil' }} {...props} />; },
) as unknown as PhosphorIcon;
export const PiggyBank = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function PiggyBank(props, ref) { return <IconSlot ref={ref} names={{ p: 'PiggyBank', l: 'PiggyBank', t: 'IconPigMoney' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Pin = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Pin(props, ref) { return <IconSlot ref={ref} names={{ p: 'PushPin', l: 'Pin', t: 'IconPin' }} {...props} />; },
) as unknown as PhosphorIcon;
export const PinOff = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function PinOff(props, ref) { return <IconSlot ref={ref} names={{ p: 'PushPinSlash', l: 'PinOff', t: 'IconPinnedOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Plane = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Plane(props, ref) { return <IconSlot ref={ref} names={{ p: 'Airplane', l: 'Plane', t: 'IconPlane' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Play = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Play(props, ref) { return <IconSlot ref={ref} names={{ p: 'Play', l: 'Play', t: 'IconPlayerPlay' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Plus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Plus(props, ref) { return <IconSlot ref={ref} names={{ p: 'Plus', l: 'Plus', t: 'IconPlus' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Puzzle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Puzzle(props, ref) { return <IconSlot ref={ref} names={{ p: 'PuzzlePiece', l: 'Puzzle', t: 'IconPuzzle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Quote = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Quote(props, ref) { return <IconSlot ref={ref} names={{ p: 'Quotes', l: 'Quote', t: 'IconQuote' }} {...props} />; },
) as unknown as PhosphorIcon;
export const RefreshCcw = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function RefreshCcw(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowsCounterClockwise', l: 'RefreshCcw', t: 'IconRefresh' }} {...props} />; },
) as unknown as PhosphorIcon;
export const RefreshCw = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function RefreshCw(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowsClockwise', l: 'RefreshCw', t: 'IconRefreshDot' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Repeat = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Repeat(props, ref) { return <IconSlot ref={ref} names={{ p: 'Repeat', l: 'Repeat', t: 'IconRepeat' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Reply = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Reply(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowBendUpLeft', l: 'Reply', t: 'IconCornerUpLeft' }} {...props} />; },
) as unknown as PhosphorIcon;
export const RotateCcw = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function RotateCcw(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowCounterClockwise', l: 'RotateCcw', t: 'IconRotate2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const RotateCw = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function RotateCw(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowClockwise', l: 'RotateCw', t: 'IconRotateClockwise' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Route = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Route(props, ref) { return <IconSlot ref={ref} names={{ p: 'Path', l: 'Route', t: 'IconRoute' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Rows3 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Rows3(props, ref) { return <IconSlot ref={ref} names={{ p: 'Rows', l: 'Rows3', t: 'IconLayoutRows' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Rss = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Rss(props, ref) { return <IconSlot ref={ref} names={{ p: 'Rss', l: 'Rss', t: 'IconRss' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Salad = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Salad(props, ref) { return <IconSlot ref={ref} names={{ p: 'BowlFood', l: 'Salad', t: 'IconSalad' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Save = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Save(props, ref) { return <IconSlot ref={ref} names={{ p: 'FloppyDisk', l: 'Save', t: 'IconDeviceFloppy' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Scale = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Scale(props, ref) { return <IconSlot ref={ref} names={{ p: 'Scales', l: 'Scale', t: 'IconScale' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ScrollText = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ScrollText(props, ref) { return <IconSlot ref={ref} names={{ p: 'Scroll', l: 'ScrollText', t: 'IconScript' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Search = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Search(props, ref) { return <IconSlot ref={ref} names={{ p: 'MagnifyingGlass', l: 'Search', t: 'IconSearch' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Send = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Send(props, ref) { return <IconSlot ref={ref} names={{ p: 'PaperPlaneTilt', l: 'Send', t: 'IconSend' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Settings = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Settings(props, ref) { return <IconSlot ref={ref} names={{ p: 'GearSix', l: 'Settings', t: 'IconSettings' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Settings2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Settings2(props, ref) { return <IconSlot ref={ref} names={{ p: 'Gear', l: 'Settings2', t: 'IconSettings2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Share2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Share2(props, ref) { return <IconSlot ref={ref} names={{ p: 'ShareNetwork', l: 'Share2', t: 'IconShare2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Shield = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Shield(props, ref) { return <IconSlot ref={ref} names={{ p: 'Shield', l: 'Shield', t: 'IconShield' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ShieldAlert = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ShieldAlert(props, ref) { return <IconSlot ref={ref} names={{ p: 'ShieldWarning', l: 'ShieldAlert', t: 'IconShieldExclamation' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ShieldCheck = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ShieldCheck(props, ref) { return <IconSlot ref={ref} names={{ p: 'ShieldCheck', l: 'ShieldCheck', t: 'IconShieldCheck' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ShieldOff = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ShieldOff(props, ref) { return <IconSlot ref={ref} names={{ p: 'ShieldSlash', l: 'ShieldOff', t: 'IconShieldOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Shirt = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Shirt(props, ref) { return <IconSlot ref={ref} names={{ p: 'TShirt', l: 'Shirt', t: 'IconShirt' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Shuffle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Shuffle(props, ref) { return <IconSlot ref={ref} names={{ p: 'Shuffle', l: 'Shuffle', t: 'IconArrowsShuffle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const SlidersHorizontal = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function SlidersHorizontal(props, ref) { return <IconSlot ref={ref} names={{ p: 'SlidersHorizontal', l: 'SlidersHorizontal', t: 'IconAdjustmentsHorizontal' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Sliders = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Sliders(props, ref) { return <IconSlot ref={ref} names={{ p: 'Sliders', l: 'Sliders', t: 'IconAdjustments' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Smartphone = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Smartphone(props, ref) { return <IconSlot ref={ref} names={{ p: 'DeviceMobile', l: 'Smartphone', t: 'IconDeviceMobile' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Smile = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Smile(props, ref) { return <IconSlot ref={ref} names={{ p: 'Smiley', l: 'Smile', t: 'IconMoodSmile' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Sparkle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Sparkle(props, ref) { return <IconSlot ref={ref} names={{ p: 'Sparkle', l: 'Sparkle', t: 'IconSparkle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Sparkles = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Sparkles(props, ref) { return <IconSlot ref={ref} names={{ p: 'StarFour', l: 'Sparkles', t: 'IconSparkles' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Sprout = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Sprout(props, ref) { return <IconSlot ref={ref} names={{ p: 'Plant', l: 'Sprout', t: 'IconPlant2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Square = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Square(props, ref) { return <IconSlot ref={ref} names={{ p: 'Square', l: 'Square', t: 'IconSquare' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Star = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Star(props, ref) { return <IconSlot ref={ref} names={{ p: 'Star', l: 'Star', t: 'IconStar' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Store = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Store(props, ref) { return <IconSlot ref={ref} names={{ p: 'Storefront', l: 'Store', t: 'IconBuildingStore' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Sun = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Sun(props, ref) { return <IconSlot ref={ref} names={{ p: 'Sun', l: 'Sun', t: 'IconSun' }} {...props} />; },
) as unknown as PhosphorIcon;
export const SunDim = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function SunDim(props, ref) { return <IconSlot ref={ref} names={{ p: 'SunDim', l: 'SunDim', t: 'IconSunLow' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Sunrise = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Sunrise(props, ref) { return <IconSlot ref={ref} names={{ p: 'SunHorizon', l: 'Sunrise', t: 'IconSunrise' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Sunset = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Sunset(props, ref) { return <IconSlot ref={ref} names={{ p: 'CloudMoon', l: 'Sunset', t: 'IconSunset' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Swords = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Swords(props, ref) { return <IconSlot ref={ref} names={{ p: 'Sword', l: 'Swords', t: 'IconSwords' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Target = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Target(props, ref) { return <IconSlot ref={ref} names={{ p: 'Target', l: 'Target', t: 'IconTarget' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Thermometer = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Thermometer(props, ref) { return <IconSlot ref={ref} names={{ p: 'Thermometer', l: 'Thermometer', t: 'IconThermometer' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Timer = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Timer(props, ref) { return <IconSlot ref={ref} names={{ p: 'Timer', l: 'Timer', t: 'IconClockHour4' }} {...props} />; },
) as unknown as PhosphorIcon;
export const TimerOff = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function TimerOff(props, ref) { return <IconSlot ref={ref} names={{ p: 'HourglassMedium', l: 'TimerOff', t: 'IconClockOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Trash = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Trash(props, ref) { return <IconSlot ref={ref} names={{ p: 'Trash', l: 'Trash', t: 'IconTrash' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Trash2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Trash2(props, ref) { return <IconSlot ref={ref} names={{ p: 'TrashSimple', l: 'Trash2', t: 'IconTrashX' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Trees = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Trees(props, ref) { return <IconSlot ref={ref} names={{ p: 'Tree', l: 'Trees', t: 'IconTrees' }} {...props} />; },
) as unknown as PhosphorIcon;
export const TrendingDown = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function TrendingDown(props, ref) { return <IconSlot ref={ref} names={{ p: 'TrendDown', l: 'TrendingDown', t: 'IconTrendingDown' }} {...props} />; },
) as unknown as PhosphorIcon;
export const TrendingUp = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function TrendingUp(props, ref) { return <IconSlot ref={ref} names={{ p: 'TrendUp', l: 'TrendingUp', t: 'IconTrendingUp' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Trophy = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Trophy(props, ref) { return <IconSlot ref={ref} names={{ p: 'Trophy', l: 'Trophy', t: 'IconTrophy' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Type = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Type(props, ref) { return <IconSlot ref={ref} names={{ p: 'TextT', l: 'Type', t: 'IconTypography' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Undo2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Undo2(props, ref) { return <IconSlot ref={ref} names={{ p: 'ArrowArcLeft', l: 'Undo2', t: 'IconArrowBackUp' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Unlock = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Unlock(props, ref) { return <IconSlot ref={ref} names={{ p: 'LockOpen', l: 'Unlock', t: 'IconLockOpen' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Upload = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Upload(props, ref) { return <IconSlot ref={ref} names={{ p: 'UploadSimple', l: 'Upload', t: 'IconUpload' }} {...props} />; },
) as unknown as PhosphorIcon;
export const User = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function User(props, ref) { return <IconSlot ref={ref} names={{ p: 'User', l: 'User', t: 'IconUser' }} {...props} />; },
) as unknown as PhosphorIcon;
export const User2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function User2(props, ref) { return <IconSlot ref={ref} names={{ p: 'User', l: 'User2', t: 'IconUser' }} {...props} />; },
) as unknown as PhosphorIcon;
export const UserCircle = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function UserCircle(props, ref) { return <IconSlot ref={ref} names={{ p: 'UserCircle', l: 'UserCircle', t: 'IconUserCircle' }} {...props} />; },
) as unknown as PhosphorIcon;
export const UserMinus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function UserMinus(props, ref) { return <IconSlot ref={ref} names={{ p: 'UserMinus', l: 'UserMinus', t: 'IconUserMinus' }} {...props} />; },
) as unknown as PhosphorIcon;
export const UserPlus = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function UserPlus(props, ref) { return <IconSlot ref={ref} names={{ p: 'UserPlus', l: 'UserPlus', t: 'IconUserPlus' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Users = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Users(props, ref) { return <IconSlot ref={ref} names={{ p: 'Users', l: 'Users', t: 'IconUsers' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Utensils = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Utensils(props, ref) { return <IconSlot ref={ref} names={{ p: 'ForkKnife', l: 'Utensils', t: 'IconToolsKitchen2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const UtensilsCrossed = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function UtensilsCrossed(props, ref) { return <IconSlot ref={ref} names={{ p: 'Knife', l: 'UtensilsCrossed', t: 'IconToolsKitchen3' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Vibrate = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Vibrate(props, ref) { return <IconSlot ref={ref} names={{ p: 'Vibrate', l: 'Vibrate', t: 'IconDeviceMobileVibration' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Video = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Video(props, ref) { return <IconSlot ref={ref} names={{ p: 'VideoCamera', l: 'Video', t: 'IconVideo' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Volume2 = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Volume2(props, ref) { return <IconSlot ref={ref} names={{ p: 'SpeakerHigh', l: 'Volume2', t: 'IconVolume2' }} {...props} />; },
) as unknown as PhosphorIcon;
export const VolumeX = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function VolumeX(props, ref) { return <IconSlot ref={ref} names={{ p: 'SpeakerSlash', l: 'VolumeX', t: 'IconVolumeOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Waves = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Waves(props, ref) { return <IconSlot ref={ref} names={{ p: 'Waves', l: 'Waves', t: 'IconRipple' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Wheat = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Wheat(props, ref) { return <IconSlot ref={ref} names={{ p: 'Grains', l: 'Wheat', t: 'IconWheat' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Wifi = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Wifi(props, ref) { return <IconSlot ref={ref} names={{ p: 'WifiHigh', l: 'Wifi', t: 'IconWifi' }} {...props} />; },
) as unknown as PhosphorIcon;
export const WifiOff = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function WifiOff(props, ref) { return <IconSlot ref={ref} names={{ p: 'WifiSlash', l: 'WifiOff', t: 'IconWifiOff' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Wind = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Wind(props, ref) { return <IconSlot ref={ref} names={{ p: 'Wind', l: 'Wind', t: 'IconWind' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Wrench = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Wrench(props, ref) { return <IconSlot ref={ref} names={{ p: 'Wrench', l: 'Wrench', t: 'IconTool' }} {...props} />; },
) as unknown as PhosphorIcon;
export const X = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function X(props, ref) { return <IconSlot ref={ref} names={{ p: 'X', l: 'X', t: 'IconX' }} {...props} />; },
) as unknown as PhosphorIcon;
export const Zap = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function Zap(props, ref) { return <IconSlot ref={ref} names={{ p: 'Lightning', l: 'Zap', t: 'IconBolt' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ZoomIn = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ZoomIn(props, ref) { return <IconSlot ref={ref} names={{ p: 'MagnifyingGlassPlus', l: 'ZoomIn', t: 'IconZoomIn' }} {...props} />; },
) as unknown as PhosphorIcon;
export const ZoomOut = /*#__PURE__*/ forwardRef<SVGSVGElement, IconComponentProps>(
  function ZoomOut(props, ref) { return <IconSlot ref={ref} names={{ p: 'MagnifyingGlassMinus', l: 'ZoomOut', t: 'IconZoomOut' }} {...props} />; },
) as unknown as PhosphorIcon;

/* Fallback: unmapped lucide-style names keep resolving from lucide. */
export * from 'lucide-react';
