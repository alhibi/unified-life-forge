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
import { IconContext, type Icon as PhosphorIcon, type IconProps } from '@phosphor-icons/react';
import * as LucideMod from 'lucide-react';
import * as TablerMod from '@tabler/icons-react';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
  type FC,
  type ReactNode,
  type SVGProps,
} from 'react';

import { useApp } from '@/contexts/AppContext';

export type IconSet = 'phosphor' | 'lucide' | 'tabler';

/* ------------------------------------------------------------------------- */
/*  Context + persistence                                                     */
/* ------------------------------------------------------------------------- */

const STORAGE_KEY = 'app-icon-set';
const VALID: readonly IconSet[] = ['phosphor', 'lucide', 'tabler'];

function readStored(): IconSet {
  if (typeof window === 'undefined') return 'phosphor';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return (VALID as readonly string[]).includes(v ?? '') ? (v as IconSet) : 'phosphor';
  } catch {
    return 'phosphor';
  }
}

const CHANGE_EVENT = 'app-icon-set:change';
const IconSetContext = createContext<IconSet>('phosphor');

export function useIconSet(): IconSet {
  return useContext(IconSetContext);
}

/**
 * Change the active icon library. Writes to localStorage and broadcasts a
 * DOM event so every mounted `IconProvider` re-renders immediately without
 * plumbing setters through half a dozen contexts.
 */
export function setIconSet(next: IconSet): void {
  if (!(VALID as readonly string[]).includes(next)) return;
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

export const ICON_WEIGHT: NonNullable<IconProps['weight']> = 'regular';
export const ICON_DEFAULT_SIZE = 24;

export type IconComponentProps = Omit<IconProps, 'weight'> & {
  weight?: IconProps['weight'];
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

type Names = { p: string; l: string; t: string };

const PhosLib = PhosMod as Record<string, PhosphorIcon | undefined>;
const LucideLib = LucideMod as Record<string, FC<SVGProps<SVGSVGElement>> | undefined>;
const TablerLib = TablerMod as Record<string, FC<SVGProps<SVGSVGElement> & { stroke?: number }> | undefined>;

function pickComponent(set: IconSet, names: Names) {
  if (set === 'lucide') {
    return LucideLib[names.l] ?? LucideLib[names.p] ?? PhosLib[names.p];
  }
  if (set === 'tabler') {
    return (
      TablerLib[names.t] ??
      TablerLib['Icon' + names.l] ??
      LucideLib[names.l] ??
      PhosLib[names.p]
    );
  }
  return PhosLib[names.p];
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
  const Comp = pickComponent(set, names);
  if (!Comp) return null;

  const isSolid = fill != null && fill !== 'none' && fill !== 'transparent';

  if (set === 'phosphor') {
    const P = Comp as PhosphorIcon;
    return (
      <P
        ref={ref}
        weight={weight ?? (isSolid ? 'fill' : undefined)}
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

  if (set === 'tabler') {
    const T = Comp as FC<SVGProps<SVGSVGElement> & { stroke?: number }>;
    return (
      <T
        ref={ref as never}
        stroke={stroke ?? 1.75}
        {...(isSolid ? { fill: 'currentColor' } : {})}
        {...(rest as SVGProps<SVGSVGElement>)}
      />
    );
  }

  // lucide
  const L = Comp as FC<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;
  return (
    <L
      ref={ref as never}
      strokeWidth={stroke ?? 2}
      {...(isSolid ? { fill: 'currentColor' } : {})}
      {...(rest as SVGProps<SVGSVGElement>)}
    />
  );
});

/* ------------------------------------------------------------------------- */
/*  IconProvider — reads live iconSet from AppContext + storage broadcasts    */
/* ------------------------------------------------------------------------- */

export function IconProvider({ children }: { children: ReactNode }) {
  const { interactionStyle } = useApp();
  const weight: NonNullable<IconProps['weight']> =
    interactionStyle === 'lively' ? 'bold' : ICON_WEIGHT;

  const [set, setSet] = useState<IconSet>(() => readStored());

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<IconSet>).detail;
      if (detail && (VALID as readonly string[]).includes(detail)) setSet(detail);
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
      <IconSetContext.Provider value={set}>{children}</IconSetContext.Provider>
    </IconContext.Provider>
  );
}

/* ------------------------------------------------------------------------- */
/*  Public icon exports — 221 aliases sharing the codebase's legacy names     */
/* ------------------------------------------------------------------------- */
export const ALargeSmall: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'TextAa', l: 'ALargeSmall', t: 'IconALargeSmall' }} {...props} />
);
export const Activity: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Pulse', l: 'Activity', t: 'IconActivity' }} {...props} />
);
export const AlertCircle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'WarningCircle', l: 'AlertCircle', t: 'IconAlertCircle' }} {...props} />
);
export const AlertTriangle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Warning', l: 'AlertTriangle', t: 'IconAlertTriangle' }} {...props} />
);
export const Archive: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Archive', l: 'Archive', t: 'IconArchive' }} {...props} />
);
export const ArchiveRestore: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Archive', l: 'ArchiveRestore', t: 'IconArchiveRestore' }} {...props} />
);
export const ArrowDown: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowDown', l: 'ArrowDown', t: 'IconArrowDown' }} {...props} />
);
export const ArrowDownAZ: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SortAscending', l: 'ArrowDownAZ', t: 'IconArrowDownAZ' }} {...props} />
);
export const ArrowDownNarrowWide: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SortAscending', l: 'ArrowDownNarrowWide', t: 'IconArrowDownNarrowWide' }} {...props} />
);
export const ArrowDownWideNarrow: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SortDescending', l: 'ArrowDownWideNarrow', t: 'IconArrowDownWideNarrow' }} {...props} />
);
export const ArrowLeft: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowLeft', l: 'ArrowLeft', t: 'IconArrowLeft' }} {...props} />
);
export const ArrowRight: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowRight', l: 'ArrowRight', t: 'IconArrowRight' }} {...props} />
);
export const ArrowUpNarrowWide: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SortAscending', l: 'ArrowUpNarrowWide', t: 'IconArrowUpNarrowWide' }} {...props} />
);
export const ArrowUpWideNarrow: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SortDescending', l: 'ArrowUpWideNarrow', t: 'IconArrowUpWideNarrow' }} {...props} />
);
export const Award: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Medal', l: 'Award', t: 'IconAward' }} {...props} />
);
export const BarChart3: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ChartBar', l: 'BarChart3', t: 'IconBarChart3' }} {...props} />
);
export const BedDouble: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Bed', l: 'BedDouble', t: 'IconBedDouble' }} {...props} />
);
export const Bell: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Bell', l: 'Bell', t: 'IconBell' }} {...props} />
);
export const BellOff: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'BellSlash', l: 'BellOff', t: 'IconBellOff' }} {...props} />
);
export const BellRing: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'BellRinging', l: 'BellRing', t: 'IconBellRing' }} {...props} />
);
export const Binoculars: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Binoculars', l: 'Binoculars', t: 'IconBinoculars' }} {...props} />
);
export const Bold: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'TextB', l: 'Bold', t: 'IconBold' }} {...props} />
);
export const BookMarked: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'BookBookmark', l: 'BookMarked', t: 'IconBookMarked' }} {...props} />
);
export const BookOpen: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'BookOpen', l: 'BookOpen', t: 'IconBookOpen' }} {...props} />
);
export const Bookmark: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'BookmarkSimple', l: 'Bookmark', t: 'IconBookmark' }} {...props} />
);
export const BookmarkCheck: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'BookmarkSimple', l: 'BookmarkCheck', t: 'IconBookmarkCheck' }} {...props} />
);
export const Bot: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Robot', l: 'Bot', t: 'IconBot' }} {...props} />
);
export const Brain: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Brain', l: 'Brain', t: 'IconBrain' }} {...props} />
);
export const Building: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Buildings', l: 'Building', t: 'IconBuilding' }} {...props} />
);
export const Bus: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Bus', l: 'Bus', t: 'IconBus' }} {...props} />
);
export const Calculator: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Calculator', l: 'Calculator', t: 'IconCalculator' }} {...props} />
);
export const Calendar: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Calendar', l: 'Calendar', t: 'IconCalendar' }} {...props} />
);
export const CalendarDays: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CalendarDots', l: 'CalendarDays', t: 'IconCalendarDays' }} {...props} />
);
export const CalendarIcon: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Calendar', l: 'CalendarIcon', t: 'IconCalendarIcon' }} {...props} />
);
export const Camera: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Camera', l: 'Camera', t: 'IconCamera' }} {...props} />
);
export const Car: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Car', l: 'Car', t: 'IconCar' }} {...props} />
);
export const Carrot: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Carrot', l: 'Carrot', t: 'IconCarrot' }} {...props} />
);
export const Check: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Check', l: 'Check', t: 'IconCheck' }} {...props} />
);
export const CheckCheck: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Checks', l: 'CheckCheck', t: 'IconCheckCheck' }} {...props} />
);
export const CheckCircle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CheckCircle', l: 'CheckCircle', t: 'IconCheckCircle' }} {...props} />
);
export const CheckCircle2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CheckCircle', l: 'CheckCircle2', t: 'IconCheckCircle2' }} {...props} />
);
export const Cherry: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Cherries', l: 'Cherry', t: 'IconCherry' }} {...props} />
);
export const ChevronDown: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CaretDown', l: 'ChevronDown', t: 'IconChevronDown' }} {...props} />
);
export const ChevronLeft: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CaretLeft', l: 'ChevronLeft', t: 'IconChevronLeft' }} {...props} />
);
export const ChevronRight: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CaretRight', l: 'ChevronRight', t: 'IconChevronRight' }} {...props} />
);
export const ChevronUp: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CaretUp', l: 'ChevronUp', t: 'IconChevronUp' }} {...props} />
);
export const ChevronsDown: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CaretDoubleDown', l: 'ChevronsDown', t: 'IconChevronsDown' }} {...props} />
);
export const ChevronsUp: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CaretDoubleUp', l: 'ChevronsUp', t: 'IconChevronsUp' }} {...props} />
);
export const Circle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Circle', l: 'Circle', t: 'IconCircle' }} {...props} />
);
export const CircleCheck: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CheckCircle', l: 'CircleCheck', t: 'IconCircleCheck' }} {...props} />
);
export const Citrus: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Orange', l: 'Citrus', t: 'IconCitrus' }} {...props} />
);
export const Clipboard: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Clipboard', l: 'Clipboard', t: 'IconClipboard' }} {...props} />
);
export const ClipboardCopy: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Clipboard', l: 'ClipboardCopy', t: 'IconClipboardCopy' }} {...props} />
);
export const Clock: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Clock', l: 'Clock', t: 'IconClock' }} {...props} />
);
export const Cloud: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Cloud', l: 'Cloud', t: 'IconCloud' }} {...props} />
);
export const CloudDrizzle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CloudRain', l: 'CloudDrizzle', t: 'IconCloudDrizzle' }} {...props} />
);
export const CloudFog: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CloudFog', l: 'CloudFog', t: 'IconCloudFog' }} {...props} />
);
export const CloudLightning: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CloudLightning', l: 'CloudLightning', t: 'IconCloudLightning' }} {...props} />
);
export const CloudRain: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CloudRain', l: 'CloudRain', t: 'IconCloudRain' }} {...props} />
);
export const CloudSnow: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CloudSnow', l: 'CloudSnow', t: 'IconCloudSnow' }} {...props} />
);
export const CloudSun: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CloudSun', l: 'CloudSun', t: 'IconCloudSun' }} {...props} />
);
export const Cloudy: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Cloud', l: 'Cloudy', t: 'IconCloudy' }} {...props} />
);
export const Coffee: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Coffee', l: 'Coffee', t: 'IconCoffee' }} {...props} />
);
export const Compass: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Compass', l: 'Compass', t: 'IconCompass' }} {...props} />
);
export const Contrast: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CircleHalf', l: 'Contrast', t: 'IconContrast' }} {...props} />
);
export const Cookie: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Cookie', l: 'Cookie', t: 'IconCookie' }} {...props} />
);
export const Copy: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Copy', l: 'Copy', t: 'IconCopy' }} {...props} />
);
export const CornerDownLeft: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowElbowDownLeft', l: 'CornerDownLeft', t: 'IconCornerDownLeft' }} {...props} />
);
export const Crosshair: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Crosshair', l: 'Crosshair', t: 'IconCrosshair' }} {...props} />
);
export const Crown: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Crown', l: 'Crown', t: 'IconCrown' }} {...props} />
);
export const Database: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Database', l: 'Database', t: 'IconDatabase' }} {...props} />
);
export const Dices: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'DiceFive', l: 'Dices', t: 'IconDices' }} {...props} />
);
export const DoorOpen: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'DoorOpen', l: 'DoorOpen', t: 'IconDoorOpen' }} {...props} />
);
export const Download: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'DownloadSimple', l: 'Download', t: 'IconDownload' }} {...props} />
);
export const Droplet: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Drop', l: 'Droplet', t: 'IconDroplet' }} {...props} />
);
export const Droplets: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Drop', l: 'Droplets', t: 'IconDroplets' }} {...props} />
);
export const Dumbbell: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Barbell', l: 'Dumbbell', t: 'IconDumbbell' }} {...props} />
);
export const Egg: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Egg', l: 'Egg', t: 'IconEgg' }} {...props} />
);
export const Eraser: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Eraser', l: 'Eraser', t: 'IconEraser' }} {...props} />
);
export const ExternalLink: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowSquareOut', l: 'ExternalLink', t: 'IconExternalLink' }} {...props} />
);
export const Eye: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Eye', l: 'Eye', t: 'IconEye' }} {...props} />
);
export const EyeOff: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'EyeSlash', l: 'EyeOff', t: 'IconEyeOff' }} {...props} />
);
export const Feather: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Feather', l: 'Feather', t: 'IconFeather' }} {...props} />
);
export const FileText: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'FileText', l: 'FileText', t: 'IconFileText' }} {...props} />
);
export const Filter: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Funnel', l: 'Filter', t: 'IconFilter' }} {...props} />
);
export const Fish: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Fish', l: 'Fish', t: 'IconFish' }} {...props} />
);
export const Flag: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Flag', l: 'Flag', t: 'IconFlag' }} {...props} />
);
export const Flame: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Flame', l: 'Flame', t: 'IconFlame' }} {...props} />
);
export const FlaskConical: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Flask', l: 'FlaskConical', t: 'IconFlaskConical' }} {...props} />
);
export const FolderOpen: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'FolderOpen', l: 'FolderOpen', t: 'IconFolderOpen' }} {...props} />
);
export const Forward: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowBendUpRight', l: 'Forward', t: 'IconForward' }} {...props} />
);
export const Gamepad2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'GameController', l: 'Gamepad2', t: 'IconGamepad2' }} {...props} />
);
export const Gauge: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Gauge', l: 'Gauge', t: 'IconGauge' }} {...props} />
);
export const Globe: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Globe', l: 'Globe', t: 'IconGlobe' }} {...props} />
);
export const Grid3X3: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'GridNine', l: 'Grid3X3', t: 'IconGrid3X3' }} {...props} />
);
export const HandHeart: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'HandHeart', l: 'HandHeart', t: 'IconHandHeart' }} {...props} />
);
export const HardDrive: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'HardDrive', l: 'HardDrive', t: 'IconHardDrive' }} {...props} />
);
export const Hash: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Hash', l: 'Hash', t: 'IconHash' }} {...props} />
);
export const Heart: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Heart', l: 'Heart', t: 'IconHeart' }} {...props} />
);
export const HelpCircle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Question', l: 'HelpCircle', t: 'IconHelpCircle' }} {...props} />
);
export const History: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ClockCounterClockwise', l: 'History', t: 'IconHistory' }} {...props} />
);
export const Home: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'House', l: 'Home', t: 'IconHome' }} {...props} />
);
export const House: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'House', l: 'House', t: 'IconHouse' }} {...props} />
);
export const Image: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Image', l: 'Image', t: 'IconImage' }} {...props} />
);
export const ImageIcon: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Image', l: 'ImageIcon', t: 'IconImageIcon' }} {...props} />
);
export const ImageOff: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ImageBroken', l: 'ImageOff', t: 'IconImageOff' }} {...props} />
);
export const Info: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Info', l: 'Info', t: 'IconInfo' }} {...props} />
);
export const Key: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Key', l: 'Key', t: 'IconKey' }} {...props} />
);
export const Landmark: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Bank', l: 'Landmark', t: 'IconLandmark' }} {...props} />
);
export const Languages: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Translate', l: 'Languages', t: 'IconLanguages' }} {...props} />
);
export const Layers: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Stack', l: 'Layers', t: 'IconLayers' }} {...props} />
);
export const LayoutGrid: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SquaresFour', l: 'LayoutGrid', t: 'IconLayoutGrid' }} {...props} />
);
export const Leaf: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Leaf', l: 'Leaf', t: 'IconLeaf' }} {...props} />
);
export const Library: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Books', l: 'Library', t: 'IconLibrary' }} {...props} />
);
export const LibraryBig: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Books', l: 'LibraryBig', t: 'IconLibraryBig' }} {...props} />
);
export const Lightbulb: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Lightbulb', l: 'Lightbulb', t: 'IconLightbulb' }} {...props} />
);
export const Link2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Link', l: 'Link2', t: 'IconLink2' }} {...props} />
);
export const List: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'List', l: 'List', t: 'IconList' }} {...props} />
);
export const Loader2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'CircleNotch', l: 'Loader2', t: 'IconLoader2' }} {...props} />
);
export const Lock: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Lock', l: 'Lock', t: 'IconLock' }} {...props} />
);
export const LogIn: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SignIn', l: 'LogIn', t: 'IconLogIn' }} {...props} />
);
export const LogOut: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SignOut', l: 'LogOut', t: 'IconLogOut' }} {...props} />
);
export const Luggage: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SuitcaseRolling', l: 'Luggage', t: 'IconLuggage' }} {...props} />
);
export const Map: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'MapTrifold', l: 'Map', t: 'IconMap' }} {...props} />
);
export const MapPin: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'MapPin', l: 'MapPin', t: 'IconMapPin' }} {...props} />
);
export const Maximize2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowsOut', l: 'Maximize2', t: 'IconMaximize2' }} {...props} />
);
export const MessageCircle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ChatCircle', l: 'MessageCircle', t: 'IconMessageCircle' }} {...props} />
);
export const MessageSquareText: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ChatText', l: 'MessageSquareText', t: 'IconMessageSquareText' }} {...props} />
);
export const Mic: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Microphone', l: 'Mic', t: 'IconMic' }} {...props} />
);
export const Minus: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Minus', l: 'Minus', t: 'IconMinus' }} {...props} />
);
export const Moon: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Moon', l: 'Moon', t: 'IconMoon' }} {...props} />
);
export const MoonStar: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'MoonStars', l: 'MoonStar', t: 'IconMoonStar' }} {...props} />
);
export const MoreHorizontal: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'DotsThree', l: 'MoreHorizontal', t: 'IconMoreHorizontal' }} {...props} />
);
export const MoreVertical: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'DotsThreeVertical', l: 'MoreVertical', t: 'IconMoreVertical' }} {...props} />
);
export const Mountain: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Mountains', l: 'Mountain', t: 'IconMountain' }} {...props} />
);
export const Navigation: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'NavigationArrow', l: 'Navigation', t: 'IconNavigation' }} {...props} />
);
export const Network: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ShareNetwork', l: 'Network', t: 'IconNetwork' }} {...props} />
);
export const Newspaper: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Newspaper', l: 'Newspaper', t: 'IconNewspaper' }} {...props} />
);
export const Paintbrush: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PaintBrush', l: 'Paintbrush', t: 'IconPaintbrush' }} {...props} />
);
export const Palette: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Palette', l: 'Palette', t: 'IconPalette' }} {...props} />
);
export const Pause: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Pause', l: 'Pause', t: 'IconPause' }} {...props} />
);
export const PenLine: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PencilSimpleLine', l: 'PenLine', t: 'IconPenLine' }} {...props} />
);
export const Pencil: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PencilSimple', l: 'Pencil', t: 'IconPencil' }} {...props} />
);
export const PiggyBank: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PiggyBank', l: 'PiggyBank', t: 'IconPiggyBank' }} {...props} />
);
export const Pin: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PushPin', l: 'Pin', t: 'IconPin' }} {...props} />
);
export const PinOff: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PushPinSlash', l: 'PinOff', t: 'IconPinOff' }} {...props} />
);
export const Plane: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Airplane', l: 'Plane', t: 'IconPlane' }} {...props} />
);
export const Play: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Play', l: 'Play', t: 'IconPlay' }} {...props} />
);
export const Plus: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Plus', l: 'Plus', t: 'IconPlus' }} {...props} />
);
export const Puzzle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PuzzlePiece', l: 'Puzzle', t: 'IconPuzzle' }} {...props} />
);
export const Quote: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Quotes', l: 'Quote', t: 'IconQuote' }} {...props} />
);
export const RefreshCcw: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowsCounterClockwise', l: 'RefreshCcw', t: 'IconRefreshCcw' }} {...props} />
);
export const RefreshCw: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowsClockwise', l: 'RefreshCw', t: 'IconRefreshCw' }} {...props} />
);
export const Repeat: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Repeat', l: 'Repeat', t: 'IconRepeat' }} {...props} />
);
export const Reply: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowBendUpLeft', l: 'Reply', t: 'IconReply' }} {...props} />
);
export const RotateCcw: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowCounterClockwise', l: 'RotateCcw', t: 'IconRotateCcw' }} {...props} />
);
export const RotateCw: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowClockwise', l: 'RotateCw', t: 'IconRotateCw' }} {...props} />
);
export const Route: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Path', l: 'Route', t: 'IconRoute' }} {...props} />
);
export const Rows3: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Rows', l: 'Rows3', t: 'IconRows3' }} {...props} />
);
export const Rss: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Rss', l: 'Rss', t: 'IconRss' }} {...props} />
);
export const Salad: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'BowlFood', l: 'Salad', t: 'IconSalad' }} {...props} />
);
export const Save: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'FloppyDisk', l: 'Save', t: 'IconSave' }} {...props} />
);
export const ScrollText: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Scroll', l: 'ScrollText', t: 'IconScrollText' }} {...props} />
);
export const Search: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'MagnifyingGlass', l: 'Search', t: 'IconSearch' }} {...props} />
);
export const Send: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'PaperPlaneTilt', l: 'Send', t: 'IconSend' }} {...props} />
);
export const Settings: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'GearSix', l: 'Settings', t: 'IconSettings' }} {...props} />
);
export const Settings2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Gear', l: 'Settings2', t: 'IconSettings2' }} {...props} />
);
export const Share2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ShareNetwork', l: 'Share2', t: 'IconShare2' }} {...props} />
);
export const Shield: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Shield', l: 'Shield', t: 'IconShield' }} {...props} />
);
export const ShieldAlert: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ShieldWarning', l: 'ShieldAlert', t: 'IconShieldAlert' }} {...props} />
);
export const ShieldCheck: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ShieldCheck', l: 'ShieldCheck', t: 'IconShieldCheck' }} {...props} />
);
export const ShieldOff: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ShieldSlash', l: 'ShieldOff', t: 'IconShieldOff' }} {...props} />
);
export const Shirt: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'TShirt', l: 'Shirt', t: 'IconShirt' }} {...props} />
);
export const Shuffle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Shuffle', l: 'Shuffle', t: 'IconShuffle' }} {...props} />
);
export const SlidersHorizontal: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SlidersHorizontal', l: 'SlidersHorizontal', t: 'IconSlidersHorizontal' }} {...props} />
);
export const Smartphone: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'DeviceMobile', l: 'Smartphone', t: 'IconSmartphone' }} {...props} />
);
export const Smile: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Smiley', l: 'Smile', t: 'IconSmile' }} {...props} />
);
export const Sparkles: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Sparkle', l: 'Sparkles', t: 'IconSparkles' }} {...props} />
);
export const Sprout: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Plant', l: 'Sprout', t: 'IconSprout' }} {...props} />
);
export const Star: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Star', l: 'Star', t: 'IconStar' }} {...props} />
);
export const Store: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Storefront', l: 'Store', t: 'IconStore' }} {...props} />
);
export const Sun: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Sun', l: 'Sun', t: 'IconSun' }} {...props} />
);
export const SunDim: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SunDim', l: 'SunDim', t: 'IconSunDim' }} {...props} />
);
export const Sunrise: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SunHorizon', l: 'Sunrise', t: 'IconSunrise' }} {...props} />
);
export const Sunset: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SunHorizon', l: 'Sunset', t: 'IconSunset' }} {...props} />
);
export const Swords: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Sword', l: 'Swords', t: 'IconSwords' }} {...props} />
);
export const Target: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Target', l: 'Target', t: 'IconTarget' }} {...props} />
);
export const Timer: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Timer', l: 'Timer', t: 'IconTimer' }} {...props} />
);
export const TimerOff: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Timer', l: 'TimerOff', t: 'IconTimerOff' }} {...props} />
);
export const Trash: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Trash', l: 'Trash', t: 'IconTrash' }} {...props} />
);
export const Trash2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'TrashSimple', l: 'Trash2', t: 'IconTrash2' }} {...props} />
);
export const Trees: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Tree', l: 'Trees', t: 'IconTrees' }} {...props} />
);
export const TrendingDown: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'TrendDown', l: 'TrendingDown', t: 'IconTrendingDown' }} {...props} />
);
export const TrendingUp: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'TrendUp', l: 'TrendingUp', t: 'IconTrendingUp' }} {...props} />
);
export const Trophy: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Trophy', l: 'Trophy', t: 'IconTrophy' }} {...props} />
);
export const Type: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'TextT', l: 'Type', t: 'IconType' }} {...props} />
);
export const Undo2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ArrowArcLeft', l: 'Undo2', t: 'IconUndo2' }} {...props} />
);
export const Unlock: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'LockOpen', l: 'Unlock', t: 'IconUnlock' }} {...props} />
);
export const Upload: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'UploadSimple', l: 'Upload', t: 'IconUpload' }} {...props} />
);
export const User: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'User', l: 'User', t: 'IconUser' }} {...props} />
);
export const User2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'User', l: 'User2', t: 'IconUser2' }} {...props} />
);
export const UserCircle: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'UserCircle', l: 'UserCircle', t: 'IconUserCircle' }} {...props} />
);
export const UserMinus: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'UserMinus', l: 'UserMinus', t: 'IconUserMinus' }} {...props} />
);
export const UserPlus: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'UserPlus', l: 'UserPlus', t: 'IconUserPlus' }} {...props} />
);
export const Users: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Users', l: 'Users', t: 'IconUsers' }} {...props} />
);
export const Utensils: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ForkKnife', l: 'Utensils', t: 'IconUtensils' }} {...props} />
);
export const UtensilsCrossed: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'ForkKnife', l: 'UtensilsCrossed', t: 'IconUtensilsCrossed' }} {...props} />
);
export const Vibrate: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Vibrate', l: 'Vibrate', t: 'IconVibrate' }} {...props} />
);
export const Video: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'VideoCamera', l: 'Video', t: 'IconVideo' }} {...props} />
);
export const Volume2: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SpeakerHigh', l: 'Volume2', t: 'IconVolume2' }} {...props} />
);
export const VolumeX: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'SpeakerSlash', l: 'VolumeX', t: 'IconVolumeX' }} {...props} />
);
export const Waves: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Waves', l: 'Waves', t: 'IconWaves' }} {...props} />
);
export const Wheat: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Grains', l: 'Wheat', t: 'IconWheat' }} {...props} />
);
export const Wifi: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'WifiHigh', l: 'Wifi', t: 'IconWifi' }} {...props} />
);
export const WifiOff: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'WifiSlash', l: 'WifiOff', t: 'IconWifiOff' }} {...props} />
);
export const Wind: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Wind', l: 'Wind', t: 'IconWind' }} {...props} />
);
export const Wrench: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Wrench', l: 'Wrench', t: 'IconWrench' }} {...props} />
);
export const X: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'X', l: 'X', t: 'IconX' }} {...props} />
);
export const Zap: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'Lightning', l: 'Zap', t: 'IconZap' }} {...props} />
);
export const ZoomIn: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'MagnifyingGlassPlus', l: 'ZoomIn', t: 'IconZoomIn' }} {...props} />
);
export const ZoomOut: FC<IconComponentProps> = (props) => (
  <IconSlot names={{ p: 'MagnifyingGlassMinus', l: 'ZoomOut', t: 'IconZoomOut' }} {...props} />
);

/* Fallback: unmapped lucide-style names keep resolving from lucide. */
export * from 'lucide-react';
