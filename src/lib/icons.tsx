/**
 * Centralized icon module — swappable icon libraries.
 * ---------------------------------------------------------------------------
 * The app supports FOUR full icon libraries the user can switch between from
 * Appearance settings. Each has a genuinely different personality:
 *
 *   • hugeicons — balanced, modern, softly geometric (default)
 *   • phosphor  — refined, rounded, editorial
 *   • lucide    — clean, geometric, technical
 *   • tabler    — expressive, hand-drawn feel, distinctive
 *
 * A React context (`useIconSet`) tells every icon which library to render.
 * Names, sizes and stroke weights stay identical — only the glyph geometry
 * changes, so the product feels like it slipped into a different visual family
 * the moment the user picks a new set.
 *
 * ── How this used to work, and why it changed ────────────────────────────────
 *
 * The four libraries were namespace-imported and each glyph looked up by string
 * at render time:
 *
 *     import * as HugeMod from 'hugeicons-react';
 *     const HugeLib = HugeMod as Record<string, FC | undefined>;
 *     return HugeLib[names.h] ?? LucideLib[names.l] ?? PhosLib[names.p];
 *
 * A string index is opaque to a bundler, so Rollup could not prove which of the
 * 4,654 hugeicons exports (or 6,236 tabler, or 5,221 lucide) were reachable and
 * kept every one. Measured: an 11 MB entry chunk — 1.97 MB gzipped, behind a
 * blocking `<script>` — of which 7,990 KB, 96%, was icon path data, plus 2.5 MB
 * more of Phosphor in a preloaded chunk. The app renders 242 glyphs.
 *
 * All four packages are ESM with `sideEffects: false`, so the fix was to move the
 * lookup from render time to build time. `scripts/generate-icon-registry.mjs`
 * resolves every glyph against the libraries' real exports and emits plain static
 * imports into `icons/registry.<set>.ts`. Nothing about the public API or the
 * user-facing feature changed; the bundler can simply see through it now.
 *
 * Two things fell out of doing that:
 *
 *   • 51 of the hugeicons names were the placeholder `'SearchIcon'`, which does
 *     not exist in hugeicons-react. All 51 — plus `Mic`, which wanted a
 *     `Microphone01Icon` that also does not exist — silently fell through to
 *     lucide. The default set was 21% lucide glyphs. All 52 now have real
 *     hugeicons counterparts, verified against the library at generation time.
 *
 *   • `export * from 'lucide-react'` sat at the bottom as a catch-all for
 *     unmapped names. A scan of every `@/lib/icons` import in the app found zero
 *     specifiers relying on it, so it was pure weight — and it also meant any
 *     name it did serve would have ignored the user's icon-set choice entirely.
 *
 * ── Adding an icon ───────────────────────────────────────────────────────────
 *
 *   1. Add an entry to `ICON_NAMES` in `icons/names.ts`.
 *   2. `bun run icons:generate`
 *   3. Add the matching `export const` below.
 *
 * `icons/__tests__/registry.test.ts` fails if these three fall out of step.
 */
import { type Icon as PhosphorIcon, IconContext, type IconProps } from '@phosphor-icons/react';
import {
  createContext,
  type FC,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useApp } from '@/contexts/AppContext';

import { type IconName } from './icons/names';
import hugeiconsRegistry from './icons/registry.hugeicons';
import lucideRegistry from './icons/registry.lucide';
import phosphorRegistry from './icons/registry.phosphor';
import tablerRegistry from './icons/registry.tabler';
import type { IconLibraryProps, IconRegistry } from './icons/registry-types';

export type IconSet = 'phosphor' | 'lucide' | 'tabler' | 'hugeicons';

/* ------------------------------------------------------------------------- */
/*  Registries                                                                */
/* ------------------------------------------------------------------------- */

const REGISTRIES: Record<IconSet, IconRegistry> = {
  phosphor: phosphorRegistry,
  lucide: lucideRegistry,
  tabler: tablerRegistry,
  hugeicons: hugeiconsRegistry,
};

/**
 * The set every other set falls back to for a glyph it lacks.
 *
 * All four currently resolve all 242 names, so this is unused in practice — but
 * adding an icon that one library does not carry must render *something* rather
 * than a hole, and it should be a deliberate choice which set fills it.
 */
const FALLBACK_SET: IconSet = 'lucide';

/* ------------------------------------------------------------------------- */
/*  Context + persistence                                                     */
/* ------------------------------------------------------------------------- */

const STORAGE_KEY = 'app-icon-set';
const VALID: readonly IconSet[] = ['phosphor', 'lucide', 'tabler', 'hugeicons'];
const DEFAULT_SET: IconSet = 'hugeicons';

function readStored(): IconSet {
  if (typeof window === 'undefined') return DEFAULT_SET;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return (VALID as readonly string[]).includes(v ?? '') ? (v as IconSet) : DEFAULT_SET;
  } catch {
    return DEFAULT_SET;
  }
}

const CHANGE_EVENT = 'app-icon-set:change';
const IconSetContext = createContext<IconSet>(DEFAULT_SET);

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
export type IconComponent = PhosphorIcon;

export const ICON_WEIGHT: NonNullable<IconProps['weight']> = 'regular';
export const ICON_DEFAULT_SIZE = 24;

export type IconComponentProps = Omit<IconProps, 'weight'> & {
  weight?: IconProps['weight'];
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

/* ------------------------------------------------------------------------- */
/*  IconSlot — the single wrapper every exported icon delegates to            */
/* ------------------------------------------------------------------------- */

interface SlotProps extends IconComponentProps {
  // Not `name`: SVGProps declares a `name` attribute, so `{...props}` would
  // override it with an arbitrary string and the registry lookup would silently
  // miss. The compiler caught it, which is the argument for the manifest being a
  // literal union rather than `string`.
  iconName: IconName;
}

const IconSlot = forwardRef<SVGSVGElement, SlotProps>(function IconSlot(
  { iconName, fill, weight, strokeWidth, absoluteStrokeWidth: _abs, ...rest },
  ref,
) {
  const set = useIconSet();
  const Comp = REGISTRIES[set][iconName] ?? REGISTRIES[FALLBACK_SET][iconName];
  if (!Comp) return null;

  const isSolid = fill != null && fill !== 'none' && fill !== 'transparent';

  if (set === 'phosphor' && REGISTRIES.phosphor[iconName]) {
    const P = Comp as unknown as PhosphorIcon;
    return (
      <P
        ref={ref}
        weight={weight ?? (isSolid ? 'fill' : 'duotone')}
        // Phosphor accepts a color prop, not a stroke number.
        {...(rest as unknown as IconProps)}
      />
    );
  }

  // lucide, tabler and hugeicons all use SVG stroke props. Map `weight` →
  // strokeWidth roughly so the "bold" interaction setting still feels heavier.
  const strokeFromWeight =
    weight === 'bold' || weight === 'fill' ? 2.4
    : weight === 'light' || weight === 'thin' ? 1.4
    : undefined;
  const stroke =
    typeof strokeWidth === 'number' ? strokeWidth
    : typeof strokeWidth === 'string' ? Number.parseFloat(strokeWidth)
    : strokeFromWeight;

  const strokeNum = typeof stroke === 'number' && Number.isFinite(stroke) ? stroke : undefined;
  const extra: IconLibraryProps = {
    ref,
    ...(isSolid ? { fill: 'currentColor' } : {}),
    ...(rest as IconLibraryProps),
  };
  if (set === 'tabler') {
    // Airy, hand-drawn feel that reads as *tabler* at a glance.
    extra.stroke = strokeNum ?? 1.25;
  } else if (set === 'hugeicons') {
    // Hugeicons — balanced modern look.
    extra.strokeWidth = strokeNum ?? 1.5;
  } else {
    // Lucide — geometric and technical.
    extra.strokeWidth = strokeNum ?? 2;
  }
  const Any = Comp as unknown as FC<IconLibraryProps>;
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
/*  Public icon exports                                                       */
/* ------------------------------------------------------------------------- */

/**
 * Builds one exported icon component.
 *
 * Replaces 242 near-identical hand-written `forwardRef` blocks — 726 lines whose
 * only per-icon content was a name. The `#__PURE__` annotation marks each call so
 * Rollup may drop an export that no module imports.
 *
 * Everything from this comment down is generated from ICON_NAMES by
 * `bun run icons:generate`, so the export list cannot drift from the manifest or
 * the registries. `icons/__tests__/registry.test.ts` fails if it does.
 */
function icon(iconName: IconName) {
  const Component = forwardRef<SVGSVGElement, IconComponentProps>((props, ref) => (
    <IconSlot ref={ref} {...props} iconName={iconName} />
  ));
  Component.displayName = iconName;
  return Component as unknown as PhosphorIcon;
}

export const ALargeSmall = /*#__PURE__*/ icon('ALargeSmall');
export const Activity = /*#__PURE__*/ icon('Activity');
export const AlertCircle = /*#__PURE__*/ icon('AlertCircle');
export const AlertTriangle = /*#__PURE__*/ icon('AlertTriangle');
export const Apple = /*#__PURE__*/ icon('Apple');
export const Archive = /*#__PURE__*/ icon('Archive');
export const ArchiveRestore = /*#__PURE__*/ icon('ArchiveRestore');
export const ArrowDown = /*#__PURE__*/ icon('ArrowDown');
export const ArrowDownAZ = /*#__PURE__*/ icon('ArrowDownAZ');
export const ArrowDownNarrowWide = /*#__PURE__*/ icon('ArrowDownNarrowWide');
export const ArrowDownWideNarrow = /*#__PURE__*/ icon('ArrowDownWideNarrow');
export const ArrowLeft = /*#__PURE__*/ icon('ArrowLeft');
export const ArrowLeftRight = /*#__PURE__*/ icon('ArrowLeftRight');
export const ArrowRight = /*#__PURE__*/ icon('ArrowRight');
export const ArrowUp = /*#__PURE__*/ icon('ArrowUp');
export const ArrowUpNarrowWide = /*#__PURE__*/ icon('ArrowUpNarrowWide');
export const ArrowUpSquare = /*#__PURE__*/ icon('ArrowUpSquare');
export const ArrowUpWideNarrow = /*#__PURE__*/ icon('ArrowUpWideNarrow');
export const Award = /*#__PURE__*/ icon('Award');
export const BarChart3 = /*#__PURE__*/ icon('BarChart3');
export const Battery = /*#__PURE__*/ icon('Battery');
export const Bean = /*#__PURE__*/ icon('Bean');
export const BedDouble = /*#__PURE__*/ icon('BedDouble');
export const Beef = /*#__PURE__*/ icon('Beef');
export const Bell = /*#__PURE__*/ icon('Bell');
export const BellOff = /*#__PURE__*/ icon('BellOff');
export const BellRing = /*#__PURE__*/ icon('BellRing');
export const Binoculars = /*#__PURE__*/ icon('Binoculars');
export const Bold = /*#__PURE__*/ icon('Bold');
export const BookMarked = /*#__PURE__*/ icon('BookMarked');
export const BookOpen = /*#__PURE__*/ icon('BookOpen');
export const Bookmark = /*#__PURE__*/ icon('Bookmark');
export const BookmarkCheck = /*#__PURE__*/ icon('BookmarkCheck');
export const Bot = /*#__PURE__*/ icon('Bot');
export const Brain = /*#__PURE__*/ icon('Brain');
export const Building = /*#__PURE__*/ icon('Building');
export const Bus = /*#__PURE__*/ icon('Bus');
export const Calculator = /*#__PURE__*/ icon('Calculator');
export const Calendar = /*#__PURE__*/ icon('Calendar');
export const CalendarDays = /*#__PURE__*/ icon('CalendarDays');
export const CalendarIcon = /*#__PURE__*/ icon('CalendarIcon');
export const Camera = /*#__PURE__*/ icon('Camera');
export const Car = /*#__PURE__*/ icon('Car');
export const Carrot = /*#__PURE__*/ icon('Carrot');
export const Check = /*#__PURE__*/ icon('Check');
export const CheckCheck = /*#__PURE__*/ icon('CheckCheck');
export const CheckCircle = /*#__PURE__*/ icon('CheckCircle');
export const CheckCircle2 = /*#__PURE__*/ icon('CheckCircle2');
export const Cherry = /*#__PURE__*/ icon('Cherry');
export const ChevronDown = /*#__PURE__*/ icon('ChevronDown');
export const ChevronLeft = /*#__PURE__*/ icon('ChevronLeft');
export const ChevronRight = /*#__PURE__*/ icon('ChevronRight');
export const ChevronUp = /*#__PURE__*/ icon('ChevronUp');
export const ChevronsDown = /*#__PURE__*/ icon('ChevronsDown');
export const ChevronsUp = /*#__PURE__*/ icon('ChevronsUp');
export const Circle = /*#__PURE__*/ icon('Circle');
export const CircleCheck = /*#__PURE__*/ icon('CircleCheck');
export const Citrus = /*#__PURE__*/ icon('Citrus');
export const Clipboard = /*#__PURE__*/ icon('Clipboard');
export const ClipboardCopy = /*#__PURE__*/ icon('ClipboardCopy');
export const Clock = /*#__PURE__*/ icon('Clock');
export const Cloud = /*#__PURE__*/ icon('Cloud');
export const CloudDrizzle = /*#__PURE__*/ icon('CloudDrizzle');
export const CloudFog = /*#__PURE__*/ icon('CloudFog');
export const CloudLightning = /*#__PURE__*/ icon('CloudLightning');
export const CloudRain = /*#__PURE__*/ icon('CloudRain');
export const CloudSnow = /*#__PURE__*/ icon('CloudSnow');
export const CloudSun = /*#__PURE__*/ icon('CloudSun');
export const Cloudy = /*#__PURE__*/ icon('Cloudy');
export const Coffee = /*#__PURE__*/ icon('Coffee');
export const Compass = /*#__PURE__*/ icon('Compass');
export const Contrast = /*#__PURE__*/ icon('Contrast');
export const Cookie = /*#__PURE__*/ icon('Cookie');
export const Copy = /*#__PURE__*/ icon('Copy');
export const CornerDownLeft = /*#__PURE__*/ icon('CornerDownLeft');
export const Crosshair = /*#__PURE__*/ icon('Crosshair');
export const Crown = /*#__PURE__*/ icon('Crown');
export const CupSoda = /*#__PURE__*/ icon('CupSoda');
export const Database = /*#__PURE__*/ icon('Database');
export const Dices = /*#__PURE__*/ icon('Dices');
export const DoorOpen = /*#__PURE__*/ icon('DoorOpen');
export const Download = /*#__PURE__*/ icon('Download');
export const Droplet = /*#__PURE__*/ icon('Droplet');
export const Droplets = /*#__PURE__*/ icon('Droplets');
export const Dumbbell = /*#__PURE__*/ icon('Dumbbell');
export const Egg = /*#__PURE__*/ icon('Egg');
export const Eraser = /*#__PURE__*/ icon('Eraser');
export const ExternalLink = /*#__PURE__*/ icon('ExternalLink');
export const Eye = /*#__PURE__*/ icon('Eye');
export const EyeOff = /*#__PURE__*/ icon('EyeOff');
export const Feather = /*#__PURE__*/ icon('Feather');
export const FileText = /*#__PURE__*/ icon('FileText');
export const Filter = /*#__PURE__*/ icon('Filter');
export const Fish = /*#__PURE__*/ icon('Fish');
export const Flag = /*#__PURE__*/ icon('Flag');
export const Flame = /*#__PURE__*/ icon('Flame');
export const FlaskConical = /*#__PURE__*/ icon('FlaskConical');
export const FolderOpen = /*#__PURE__*/ icon('FolderOpen');
export const Forward = /*#__PURE__*/ icon('Forward');
export const Gamepad2 = /*#__PURE__*/ icon('Gamepad2');
export const Gauge = /*#__PURE__*/ icon('Gauge');
export const Github = /*#__PURE__*/ icon('Github');
export const Globe = /*#__PURE__*/ icon('Globe');
export const Grid3X3 = /*#__PURE__*/ icon('Grid3X3');
export const HandHeart = /*#__PURE__*/ icon('HandHeart');
export const HardDrive = /*#__PURE__*/ icon('HardDrive');
export const Hash = /*#__PURE__*/ icon('Hash');
export const Heart = /*#__PURE__*/ icon('Heart');
export const HelpCircle = /*#__PURE__*/ icon('HelpCircle');
export const History = /*#__PURE__*/ icon('History');
export const Home = /*#__PURE__*/ icon('Home');
export const House = /*#__PURE__*/ icon('House');
export const Image = /*#__PURE__*/ icon('Image');
export const ImageIcon = /*#__PURE__*/ icon('ImageIcon');
export const ImageOff = /*#__PURE__*/ icon('ImageOff');
export const ImagePlus = /*#__PURE__*/ icon('ImagePlus');
export const Info = /*#__PURE__*/ icon('Info');
export const Key = /*#__PURE__*/ icon('Key');
export const Landmark = /*#__PURE__*/ icon('Landmark');
export const Languages = /*#__PURE__*/ icon('Languages');
export const Layers = /*#__PURE__*/ icon('Layers');
export const Layout = /*#__PURE__*/ icon('Layout');
export const LayoutGrid = /*#__PURE__*/ icon('LayoutGrid');
export const Leaf = /*#__PURE__*/ icon('Leaf');
export const Library = /*#__PURE__*/ icon('Library');
export const LibraryBig = /*#__PURE__*/ icon('LibraryBig');
export const Lightbulb = /*#__PURE__*/ icon('Lightbulb');
export const Link2 = /*#__PURE__*/ icon('Link2');
export const List = /*#__PURE__*/ icon('List');
export const ListMusic = /*#__PURE__*/ icon('ListMusic');
export const ListPlus = /*#__PURE__*/ icon('ListPlus');
export const Loader = /*#__PURE__*/ icon('Loader');
export const Loader2 = /*#__PURE__*/ icon('Loader2');
export const Lock = /*#__PURE__*/ icon('Lock');
export const LogIn = /*#__PURE__*/ icon('LogIn');
export const LogOut = /*#__PURE__*/ icon('LogOut');
export const Luggage = /*#__PURE__*/ icon('Luggage');
export const Map = /*#__PURE__*/ icon('Map');
export const MapPin = /*#__PURE__*/ icon('MapPin');
export const MapPinned = /*#__PURE__*/ icon('MapPinned');
export const Maximize2 = /*#__PURE__*/ icon('Maximize2');
export const MessageCircle = /*#__PURE__*/ icon('MessageCircle');
export const MessageSquare = /*#__PURE__*/ icon('MessageSquare');
export const MessageSquareText = /*#__PURE__*/ icon('MessageSquareText');
export const Mic = /*#__PURE__*/ icon('Mic');
export const Milk = /*#__PURE__*/ icon('Milk');
export const Minus = /*#__PURE__*/ icon('Minus');
export const Moon = /*#__PURE__*/ icon('Moon');
export const MoonStar = /*#__PURE__*/ icon('MoonStar');
export const MoreHorizontal = /*#__PURE__*/ icon('MoreHorizontal');
export const MoreVertical = /*#__PURE__*/ icon('MoreVertical');
export const Mountain = /*#__PURE__*/ icon('Mountain');
export const Music = /*#__PURE__*/ icon('Music');
export const Navigation = /*#__PURE__*/ icon('Navigation');
export const Network = /*#__PURE__*/ icon('Network');
export const Newspaper = /*#__PURE__*/ icon('Newspaper');
export const Nut = /*#__PURE__*/ icon('Nut');
export const Paintbrush = /*#__PURE__*/ icon('Paintbrush');
export const Palette = /*#__PURE__*/ icon('Palette');
export const Pause = /*#__PURE__*/ icon('Pause');
export const PenLine = /*#__PURE__*/ icon('PenLine');
export const Pencil = /*#__PURE__*/ icon('Pencil');
export const PiggyBank = /*#__PURE__*/ icon('PiggyBank');
export const Pin = /*#__PURE__*/ icon('Pin');
export const PinOff = /*#__PURE__*/ icon('PinOff');
export const Plane = /*#__PURE__*/ icon('Plane');
export const Play = /*#__PURE__*/ icon('Play');
export const Plus = /*#__PURE__*/ icon('Plus');
export const Puzzle = /*#__PURE__*/ icon('Puzzle');
export const Quote = /*#__PURE__*/ icon('Quote');
export const RefreshCcw = /*#__PURE__*/ icon('RefreshCcw');
export const RefreshCw = /*#__PURE__*/ icon('RefreshCw');
export const Repeat = /*#__PURE__*/ icon('Repeat');
export const Reply = /*#__PURE__*/ icon('Reply');
export const RotateCcw = /*#__PURE__*/ icon('RotateCcw');
export const RotateCw = /*#__PURE__*/ icon('RotateCw');
export const Route = /*#__PURE__*/ icon('Route');
export const Rows3 = /*#__PURE__*/ icon('Rows3');
export const Rss = /*#__PURE__*/ icon('Rss');
export const Salad = /*#__PURE__*/ icon('Salad');
export const Save = /*#__PURE__*/ icon('Save');
export const Scale = /*#__PURE__*/ icon('Scale');
export const ScrollText = /*#__PURE__*/ icon('ScrollText');
export const Search = /*#__PURE__*/ icon('Search');
export const Send = /*#__PURE__*/ icon('Send');
export const Settings = /*#__PURE__*/ icon('Settings');
export const Settings2 = /*#__PURE__*/ icon('Settings2');
export const Share2 = /*#__PURE__*/ icon('Share2');
export const Shield = /*#__PURE__*/ icon('Shield');
export const ShieldAlert = /*#__PURE__*/ icon('ShieldAlert');
export const ShieldCheck = /*#__PURE__*/ icon('ShieldCheck');
export const ShieldOff = /*#__PURE__*/ icon('ShieldOff');
export const Shirt = /*#__PURE__*/ icon('Shirt');
export const Shuffle = /*#__PURE__*/ icon('Shuffle');
export const SlidersHorizontal = /*#__PURE__*/ icon('SlidersHorizontal');
export const Sliders = /*#__PURE__*/ icon('Sliders');
export const Smartphone = /*#__PURE__*/ icon('Smartphone');
export const Smile = /*#__PURE__*/ icon('Smile');
export const Sparkle = /*#__PURE__*/ icon('Sparkle');
export const Sparkles = /*#__PURE__*/ icon('Sparkles');
export const Sprout = /*#__PURE__*/ icon('Sprout');
export const Square = /*#__PURE__*/ icon('Square');
export const Star = /*#__PURE__*/ icon('Star');
export const Store = /*#__PURE__*/ icon('Store');
export const Sun = /*#__PURE__*/ icon('Sun');
export const SunDim = /*#__PURE__*/ icon('SunDim');
export const Sunrise = /*#__PURE__*/ icon('Sunrise');
export const Sunset = /*#__PURE__*/ icon('Sunset');
export const Swords = /*#__PURE__*/ icon('Swords');
export const Target = /*#__PURE__*/ icon('Target');
export const Thermometer = /*#__PURE__*/ icon('Thermometer');
export const Timer = /*#__PURE__*/ icon('Timer');
export const TimerOff = /*#__PURE__*/ icon('TimerOff');
export const Trash = /*#__PURE__*/ icon('Trash');
export const Trash2 = /*#__PURE__*/ icon('Trash2');
export const Trees = /*#__PURE__*/ icon('Trees');
export const TrendingDown = /*#__PURE__*/ icon('TrendingDown');
export const TrendingUp = /*#__PURE__*/ icon('TrendingUp');
export const Trophy = /*#__PURE__*/ icon('Trophy');
export const Type = /*#__PURE__*/ icon('Type');
export const Undo2 = /*#__PURE__*/ icon('Undo2');
export const Unlock = /*#__PURE__*/ icon('Unlock');
export const Upload = /*#__PURE__*/ icon('Upload');
export const User = /*#__PURE__*/ icon('User');
export const User2 = /*#__PURE__*/ icon('User2');
export const UserCircle = /*#__PURE__*/ icon('UserCircle');
export const UserMinus = /*#__PURE__*/ icon('UserMinus');
export const UserPlus = /*#__PURE__*/ icon('UserPlus');
export const Users = /*#__PURE__*/ icon('Users');
export const Utensils = /*#__PURE__*/ icon('Utensils');
export const UtensilsCrossed = /*#__PURE__*/ icon('UtensilsCrossed');
export const Vibrate = /*#__PURE__*/ icon('Vibrate');
export const Video = /*#__PURE__*/ icon('Video');
export const Volume2 = /*#__PURE__*/ icon('Volume2');
export const VolumeX = /*#__PURE__*/ icon('VolumeX');
export const Waves = /*#__PURE__*/ icon('Waves');
export const Wheat = /*#__PURE__*/ icon('Wheat');
export const Wifi = /*#__PURE__*/ icon('Wifi');
export const WifiOff = /*#__PURE__*/ icon('WifiOff');
export const Wind = /*#__PURE__*/ icon('Wind');
export const Wrench = /*#__PURE__*/ icon('Wrench');
export const X = /*#__PURE__*/ icon('X');
export const Zap = /*#__PURE__*/ icon('Zap');
export const ZoomIn = /*#__PURE__*/ icon('ZoomIn');
export const ZoomOut = /*#__PURE__*/ icon('ZoomOut');
