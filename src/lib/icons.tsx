/**
 * Centralized icon module — premium icon set.
 * ---------------------------------------------------------------------------
 * The app historically imported icons directly from `lucide-react`. To give
 * the whole product a more refined, "premium" look we now render
 * `@phosphor-icons/react` glyphs instead, while keeping the exact same import
 * names the codebase already uses (e.g. `Search`, `House`, `Trash2`).
 *
 * Every export here is a thin wrapper that accepts the lucide-style props the
 * codebase already passes (`className`, `size`, `strokeWidth`, `fill`, ...) and
 * forwards them to the matching Phosphor icon:
 *   • `strokeWidth` / `absoluteStrokeWidth` are dropped (Phosphor uses weights).
 *   • a truthy `fill` (e.g. `fill="currentColor"`) becomes Phosphor `weight="fill"`
 *     so active/solid states (favourite Heart, Star, Play) keep working.
 *   • the global stroke weight is controlled by <IconProvider> (see App.tsx).
 *
 * Any lucide name we did NOT map (a handful of niche food icons) is still
 * re-exported from lucide-react via the `export *` below, so nothing breaks.
 *
 * NOTE: This file is generated/maintained as the single source of truth for
 * icons. Prefer importing icons from "@/lib/icons" everywhere.
 */
import type { Icon as PhosphorIcon, IconProps } from '@phosphor-icons/react';
import { IconContext } from '@phosphor-icons/react';
import {
  Airplane,
  Archive,
  ArrowArcLeft,
  ArrowBendUpLeft,
  ArrowBendUpRight,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowDown,
  ArrowElbowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  ArrowsCounterClockwise,
  ArrowsOut,
  ArrowSquareOut,
  Bank,
  Barbell,
  Bed,
  Bell,
  BellRinging,
  BellSlash,
  Binoculars,
  BookBookmark,
  BookmarkSimple,
  BookOpen,
  Books,
  BowlFood,
  Brain,
  Buildings,
  Bus,
  Calculator,
  Calendar,
  CalendarDots,
  Camera,
  Car,
  CaretDoubleDown,
  CaretDoubleUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Carrot,
  ChartBar,
  ChatCircle,
  ChatText,
  Check,
  CheckCircle,
  Checks,
  Cherries,
  Circle,
  CircleHalf,
  CircleNotch,
  Clipboard,
  Clock,
  ClockCounterClockwise,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Coffee,
  Compass,
  Cookie,
  Copy,
  Crosshair,
  Crown,
  Database,
  DeviceMobile,
  DiceFive,
  DoorOpen,
  DotsThree,
  DotsThreeVertical,
  DownloadSimple,
  Drop,
  Egg,
  Eraser,
  Eye,
  EyeSlash,
  Feather,
  FileText,
  Fish,
  Flag,
  Flame,
  Flask,
  FloppyDisk,
  FolderOpen,
  ForkKnife,
  Funnel,
  GameController,
  Gauge,
  Gear,
  GearSix,
  Globe,
  Grains,
  GridNine,
  HandHeart,
  HardDrive,
  Hash,
  Heart,
  House,
  Image,
  ImageBroken,
  Info,
  Key,
  Leaf,
  Lightbulb,
  Lightning,
  Link,
  List,
  Lock,
  LockOpen,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  MapPin,
  MapTrifold,
  Medal,
  Microphone,
  Minus,
  Moon,
  MoonStars,
  Mountains,
  NavigationArrow,
  Newspaper,
  Orange,
  PaintBrush,
  Palette,
  PaperPlaneTilt,
  Path,
  Pause,
  PencilSimple,
  PencilSimpleLine,
  PiggyBank,
  Plant,
  Play,
  Plus,
  Pulse,
  PushPin,
  PushPinSlash,
  PuzzlePiece,
  Question,
  Quotes,
  Repeat,
  Robot,
  Rows,
  Rss,
  Scroll,
  ShareNetwork,
  Shield,
  ShieldCheck,
  ShieldSlash,
  ShieldWarning,
  Shuffle,
  SignIn,
  SignOut,
  SlidersHorizontal,
  Smiley,
  SortAscending,
  SortDescending,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  SquaresFour,
  Stack,
  Star,
  Storefront,
  SuitcaseRolling,
  Sun,
  SunDim,
  SunHorizon,
  Sword,
  Target,
  TextAa,
  TextB,
  TextT,
  Timer,
  Translate,
  Trash,
  TrashSimple,
  Tree,
  TrendDown,
  TrendUp,
  Trophy,
  TShirt,
  UploadSimple,
  User,
  UserCircle,
  UserMinus,
  UserPlus,
  Users,
  Vibrate,
  VideoCamera,
  Warning,
  WarningCircle,
  Waves,
  WifiHigh,
  WifiSlash,
  Wind,
  Wrench,
  X,
} from '@phosphor-icons/react';
import { forwardRef, type ReactNode } from 'react';

import { useApp } from '@/contexts/AppContext';

/** Re-export the Phosphor icon component type under the legacy name. */
export type { Icon as LucideIcon } from '@phosphor-icons/react';

/**
 * Global stroke weight for every icon in the app. Phosphor ships six weights —
 * "thin" | "light" | "regular" | "bold" | "fill" | "duotone".
 *
 * REFINED MIX (active visual language):
 *   • Default = "regular"  → crisp, light, Apple-grade outlines for ALL resting
 *     icons. Reads as one calm, unified family across every screen.
 *   • "fill"               → automatically applied to icons that pass a truthy
 *     `fill` prop (saved bookmark, active Heart/Star, Play button, active
 *     bottom-nav tab). This is the single emphatic note that makes active
 *     state instantly readable without breaking the outline family.
 *
 * This pairing (Regular + Fill) keeps the whole product visually quiet and
 * premium, while giving selected/active controls a clear, deliberate weight.
 */
export const ICON_WEIGHT: NonNullable<IconProps['weight']> = 'regular';

/**
 * Default rendered size (px) for icons that don't set their own size via a
 * `size` prop or a Tailwind sizing class (h-4, w-4, ...). 24 matches the
 * previous icon library's default so existing layouts are preserved.
 */
export const ICON_DEFAULT_SIZE = 24;

/**
 * Wrap the app once with <IconProvider> so all icons share the premium weight
 * and default size. Per-icon props (and a truthy `fill`, which becomes the
 * "fill" weight) still override these defaults.
 */
export function IconProvider({ children }: { children: ReactNode }) {
  const { interactionStyle } = useApp();
  const weight: NonNullable<IconProps['weight']> =
    interactionStyle === 'lively' ? 'bold' : ICON_WEIGHT;

  return (
    <IconContext.Provider value={{ weight, size: ICON_DEFAULT_SIZE, color: 'currentColor' }}>
      {children}
    </IconContext.Provider>
  );
}

/**
 * Props accepted by every icon. Superset of Phosphor's IconProps plus the
 * legacy lucide-only props so existing call-sites keep type-checking.
 */
export type IconComponentProps = Omit<IconProps, 'weight'> & {
  weight?: IconProps['weight'];
  /** Legacy lucide prop — ignored (Phosphor uses `weight`). */
  strokeWidth?: number | string;
  /** Legacy lucide prop — ignored. */
  absoluteStrokeWidth?: boolean;
};

export type IconComponent = ReturnType<typeof makeIcon>;

function makeIcon(Base: PhosphorIcon, displayName: string) {
  const Wrapped = forwardRef<SVGSVGElement, IconComponentProps>(function Icon(
    { fill, weight, strokeWidth: _strokeWidth, absoluteStrokeWidth: _absoluteStrokeWidth, ...rest },
    ref,
  ) {
    const isSolid = fill != null && fill !== 'none' && fill !== 'transparent';
    return <Base ref={ref} weight={weight ?? (isSolid ? 'fill' : undefined)} {...rest} />;
  });
  Wrapped.displayName = displayName;
  return Wrapped;
}

const Icon_Airplane = /*#__PURE__*/ makeIcon(Airplane, 'Airplane');
const Icon_Archive = /*#__PURE__*/ makeIcon(Archive, 'Archive');
const Icon_ArrowArcLeft = /*#__PURE__*/ makeIcon(ArrowArcLeft, 'ArrowArcLeft');
const Icon_ArrowBendUpLeft = /*#__PURE__*/ makeIcon(ArrowBendUpLeft, 'ArrowBendUpLeft');
const Icon_ArrowBendUpRight = /*#__PURE__*/ makeIcon(ArrowBendUpRight, 'ArrowBendUpRight');
const Icon_ArrowClockwise = /*#__PURE__*/ makeIcon(ArrowClockwise, 'ArrowClockwise');
const Icon_ArrowCounterClockwise = /*#__PURE__*/ makeIcon(
  ArrowCounterClockwise,
  'ArrowCounterClockwise',
);
const Icon_ArrowDown = /*#__PURE__*/ makeIcon(ArrowDown, 'ArrowDown');
const Icon_ArrowElbowDownLeft = /*#__PURE__*/ makeIcon(ArrowElbowDownLeft, 'ArrowElbowDownLeft');
const Icon_ArrowLeft = /*#__PURE__*/ makeIcon(ArrowLeft, 'ArrowLeft');
const Icon_ArrowRight = /*#__PURE__*/ makeIcon(ArrowRight, 'ArrowRight');
const Icon_ArrowSquareOut = /*#__PURE__*/ makeIcon(ArrowSquareOut, 'ArrowSquareOut');
const Icon_ArrowsClockwise = /*#__PURE__*/ makeIcon(ArrowsClockwise, 'ArrowsClockwise');
const Icon_ArrowsCounterClockwise = /*#__PURE__*/ makeIcon(
  ArrowsCounterClockwise,
  'ArrowsCounterClockwise',
);
const Icon_ArrowsOut = /*#__PURE__*/ makeIcon(ArrowsOut, 'ArrowsOut');
const Icon_Bank = /*#__PURE__*/ makeIcon(Bank, 'Bank');
const Icon_Barbell = /*#__PURE__*/ makeIcon(Barbell, 'Barbell');
const Icon_Bed = /*#__PURE__*/ makeIcon(Bed, 'Bed');
const Icon_Bell = /*#__PURE__*/ makeIcon(Bell, 'Bell');
const Icon_Binoculars = /*#__PURE__*/ makeIcon(Binoculars, 'Binoculars');
const Icon_BellRinging = /*#__PURE__*/ makeIcon(BellRinging, 'BellRinging');
const Icon_BellSlash = /*#__PURE__*/ makeIcon(BellSlash, 'BellSlash');
const Icon_BookBookmark = /*#__PURE__*/ makeIcon(BookBookmark, 'BookBookmark');
const Icon_BookOpen = /*#__PURE__*/ makeIcon(BookOpen, 'BookOpen');
const Icon_BookmarkSimple = /*#__PURE__*/ makeIcon(BookmarkSimple, 'BookmarkSimple');
const Icon_Books = /*#__PURE__*/ makeIcon(Books, 'Books');
const Icon_BowlFood = /*#__PURE__*/ makeIcon(BowlFood, 'BowlFood');
const Icon_Brain = /*#__PURE__*/ makeIcon(Brain, 'Brain');
const Icon_Buildings = /*#__PURE__*/ makeIcon(Buildings, 'Buildings');
const Icon_Bus = /*#__PURE__*/ makeIcon(Bus, 'Bus');
const Icon_Calculator = /*#__PURE__*/ makeIcon(Calculator, 'Calculator');
const Icon_Calendar = /*#__PURE__*/ makeIcon(Calendar, 'Calendar');
const Icon_CalendarDots = /*#__PURE__*/ makeIcon(CalendarDots, 'CalendarDots');
const Icon_Camera = /*#__PURE__*/ makeIcon(Camera, 'Camera');
const Icon_Car = /*#__PURE__*/ makeIcon(Car, 'Car');
const Icon_CaretDoubleDown = /*#__PURE__*/ makeIcon(CaretDoubleDown, 'CaretDoubleDown');
const Icon_CaretDoubleUp = /*#__PURE__*/ makeIcon(CaretDoubleUp, 'CaretDoubleUp');
const Icon_CaretDown = /*#__PURE__*/ makeIcon(CaretDown, 'CaretDown');
const Icon_CaretLeft = /*#__PURE__*/ makeIcon(CaretLeft, 'CaretLeft');
const Icon_CaretRight = /*#__PURE__*/ makeIcon(CaretRight, 'CaretRight');
const Icon_CaretUp = /*#__PURE__*/ makeIcon(CaretUp, 'CaretUp');
const Icon_Carrot = /*#__PURE__*/ makeIcon(Carrot, 'Carrot');
const Icon_ChartBar = /*#__PURE__*/ makeIcon(ChartBar, 'ChartBar');
const Icon_ChatCircle = /*#__PURE__*/ makeIcon(ChatCircle, 'ChatCircle');
const Icon_ChatText = /*#__PURE__*/ makeIcon(ChatText, 'ChatText');
const Icon_Check = /*#__PURE__*/ makeIcon(Check, 'Check');
const Icon_CheckCircle = /*#__PURE__*/ makeIcon(CheckCircle, 'CheckCircle');
const Icon_Checks = /*#__PURE__*/ makeIcon(Checks, 'Checks');
const Icon_Cherries = /*#__PURE__*/ makeIcon(Cherries, 'Cherries');
const Icon_Circle = /*#__PURE__*/ makeIcon(Circle, 'Circle');
const Icon_CircleHalf = /*#__PURE__*/ makeIcon(CircleHalf, 'CircleHalf');
const Icon_CircleNotch = /*#__PURE__*/ makeIcon(CircleNotch, 'CircleNotch');
const Icon_Clipboard = /*#__PURE__*/ makeIcon(Clipboard, 'Clipboard');
const Icon_Clock = /*#__PURE__*/ makeIcon(Clock, 'Clock');
const Icon_ClockCounterClockwise = /*#__PURE__*/ makeIcon(
  ClockCounterClockwise,
  'ClockCounterClockwise',
);
const Icon_Cloud = /*#__PURE__*/ makeIcon(Cloud, 'Cloud');
const Icon_CloudFog = /*#__PURE__*/ makeIcon(CloudFog, 'CloudFog');
const Icon_CloudLightning = /*#__PURE__*/ makeIcon(CloudLightning, 'CloudLightning');
const Icon_CloudSun = /*#__PURE__*/ makeIcon(CloudSun, 'CloudSun');
const Icon_CloudRain = /*#__PURE__*/ makeIcon(CloudRain, 'CloudRain');
const Icon_CloudSnow = /*#__PURE__*/ makeIcon(CloudSnow, 'CloudSnow');
const Icon_Coffee = /*#__PURE__*/ makeIcon(Coffee, 'Coffee');
const Icon_Compass = /*#__PURE__*/ makeIcon(Compass, 'Compass');
const Icon_Cookie = /*#__PURE__*/ makeIcon(Cookie, 'Cookie');
const Icon_Copy = /*#__PURE__*/ makeIcon(Copy, 'Copy');
const Icon_Crosshair = /*#__PURE__*/ makeIcon(Crosshair, 'Crosshair');
const Icon_Crown = /*#__PURE__*/ makeIcon(Crown, 'Crown');
const Icon_Database = /*#__PURE__*/ makeIcon(Database, 'Database');
const Icon_DeviceMobile = /*#__PURE__*/ makeIcon(DeviceMobile, 'DeviceMobile');
const Icon_DiceFive = /*#__PURE__*/ makeIcon(DiceFive, 'DiceFive');
const Icon_DoorOpen = /*#__PURE__*/ makeIcon(DoorOpen, 'DoorOpen');
const Icon_DotsThree = /*#__PURE__*/ makeIcon(DotsThree, 'DotsThree');
const Icon_DotsThreeVertical = /*#__PURE__*/ makeIcon(DotsThreeVertical, 'DotsThreeVertical');
const Icon_DownloadSimple = /*#__PURE__*/ makeIcon(DownloadSimple, 'DownloadSimple');
const Icon_Drop = /*#__PURE__*/ makeIcon(Drop, 'Drop');
const Icon_Egg = /*#__PURE__*/ makeIcon(Egg, 'Egg');
const Icon_Eraser = /*#__PURE__*/ makeIcon(Eraser, 'Eraser');
const Icon_Eye = /*#__PURE__*/ makeIcon(Eye, 'Eye');
const Icon_EyeSlash = /*#__PURE__*/ makeIcon(EyeSlash, 'EyeSlash');
const Icon_Feather = /*#__PURE__*/ makeIcon(Feather, 'Feather');
const Icon_FileText = /*#__PURE__*/ makeIcon(FileText, 'FileText');
const Icon_Fish = /*#__PURE__*/ makeIcon(Fish, 'Fish');
const Icon_Flag = /*#__PURE__*/ makeIcon(Flag, 'Flag');
const Icon_Flame = /*#__PURE__*/ makeIcon(Flame, 'Flame');
const Icon_Flask = /*#__PURE__*/ makeIcon(Flask, 'Flask');
const Icon_FloppyDisk = /*#__PURE__*/ makeIcon(FloppyDisk, 'FloppyDisk');
const Icon_FolderOpen = /*#__PURE__*/ makeIcon(FolderOpen, 'FolderOpen');
const Icon_ForkKnife = /*#__PURE__*/ makeIcon(ForkKnife, 'ForkKnife');
const Icon_Funnel = /*#__PURE__*/ makeIcon(Funnel, 'Funnel');
const Icon_GameController = /*#__PURE__*/ makeIcon(GameController, 'GameController');
const Icon_Gauge = /*#__PURE__*/ makeIcon(Gauge, 'Gauge');
const Icon_Gear = /*#__PURE__*/ makeIcon(Gear, 'Gear');
const Icon_GearSix = /*#__PURE__*/ makeIcon(GearSix, 'GearSix');
const Icon_Globe = /*#__PURE__*/ makeIcon(Globe, 'Globe');
const Icon_Grains = /*#__PURE__*/ makeIcon(Grains, 'Grains');
const Icon_GridNine = /*#__PURE__*/ makeIcon(GridNine, 'GridNine');
const Icon_HandHeart = /*#__PURE__*/ makeIcon(HandHeart, 'HandHeart');
const Icon_HardDrive = /*#__PURE__*/ makeIcon(HardDrive, 'HardDrive');
const Icon_Hash = /*#__PURE__*/ makeIcon(Hash, 'Hash');
const Icon_Heart = /*#__PURE__*/ makeIcon(Heart, 'Heart');
const Icon_House = /*#__PURE__*/ makeIcon(House, 'House');
const Icon_Image = /*#__PURE__*/ makeIcon(Image, 'Image');
const Icon_ImageBroken = /*#__PURE__*/ makeIcon(ImageBroken, 'ImageBroken');
const Icon_Info = /*#__PURE__*/ makeIcon(Info, 'Info');
const Icon_Key = /*#__PURE__*/ makeIcon(Key, 'Key');
const Icon_Leaf = /*#__PURE__*/ makeIcon(Leaf, 'Leaf');
const Icon_Lightbulb = /*#__PURE__*/ makeIcon(Lightbulb, 'Lightbulb');
const Icon_Lightning = /*#__PURE__*/ makeIcon(Lightning, 'Lightning');
const Icon_Link = /*#__PURE__*/ makeIcon(Link, 'Link');
const Icon_List = /*#__PURE__*/ makeIcon(List, 'List');
const Icon_Lock = /*#__PURE__*/ makeIcon(Lock, 'Lock');
const Icon_LockOpen = /*#__PURE__*/ makeIcon(LockOpen, 'LockOpen');
const Icon_MagnifyingGlass = /*#__PURE__*/ makeIcon(MagnifyingGlass, 'MagnifyingGlass');
const Icon_MagnifyingGlassMinus = /*#__PURE__*/ makeIcon(
  MagnifyingGlassMinus,
  'MagnifyingGlassMinus',
);
const Icon_MagnifyingGlassPlus = /*#__PURE__*/ makeIcon(MagnifyingGlassPlus, 'MagnifyingGlassPlus');
const Icon_MapPin = /*#__PURE__*/ makeIcon(MapPin, 'MapPin');
const Icon_MapTrifold = /*#__PURE__*/ makeIcon(MapTrifold, 'MapTrifold');
const Icon_Medal = /*#__PURE__*/ makeIcon(Medal, 'Medal');
const Icon_Microphone = /*#__PURE__*/ makeIcon(Microphone, 'Microphone');
const Icon_Minus = /*#__PURE__*/ makeIcon(Minus, 'Minus');
const Icon_Moon = /*#__PURE__*/ makeIcon(Moon, 'Moon');
const Icon_MoonStars = /*#__PURE__*/ makeIcon(MoonStars, 'MoonStars');
const Icon_Mountains = /*#__PURE__*/ makeIcon(Mountains, 'Mountains');
const Icon_NavigationArrow = /*#__PURE__*/ makeIcon(NavigationArrow, 'NavigationArrow');
const Icon_Newspaper = /*#__PURE__*/ makeIcon(Newspaper, 'Newspaper');
const Icon_Orange = /*#__PURE__*/ makeIcon(Orange, 'Orange');
const Icon_PaintBrush = /*#__PURE__*/ makeIcon(PaintBrush, 'PaintBrush');
const Icon_Palette = /*#__PURE__*/ makeIcon(Palette, 'Palette');
const Icon_PaperPlaneTilt = /*#__PURE__*/ makeIcon(PaperPlaneTilt, 'PaperPlaneTilt');
const Icon_Path = /*#__PURE__*/ makeIcon(Path, 'Path');
const Icon_Pause = /*#__PURE__*/ makeIcon(Pause, 'Pause');
const Icon_PencilSimple = /*#__PURE__*/ makeIcon(PencilSimple, 'PencilSimple');
const Icon_PencilSimpleLine = /*#__PURE__*/ makeIcon(PencilSimpleLine, 'PencilSimpleLine');
const Icon_PiggyBank = /*#__PURE__*/ makeIcon(PiggyBank, 'PiggyBank');
const Icon_Plant = /*#__PURE__*/ makeIcon(Plant, 'Plant');
const Icon_Play = /*#__PURE__*/ makeIcon(Play, 'Play');
const Icon_Plus = /*#__PURE__*/ makeIcon(Plus, 'Plus');
const Icon_Pulse = /*#__PURE__*/ makeIcon(Pulse, 'Pulse');
const Icon_PushPin = /*#__PURE__*/ makeIcon(PushPin, 'PushPin');
const Icon_PushPinSlash = /*#__PURE__*/ makeIcon(PushPinSlash, 'PushPinSlash');
const Icon_PuzzlePiece = /*#__PURE__*/ makeIcon(PuzzlePiece, 'PuzzlePiece');
const Icon_Question = /*#__PURE__*/ makeIcon(Question, 'Question');
const Icon_Quotes = /*#__PURE__*/ makeIcon(Quotes, 'Quotes');
const Icon_Repeat = /*#__PURE__*/ makeIcon(Repeat, 'Repeat');
const Icon_Robot = /*#__PURE__*/ makeIcon(Robot, 'Robot');
const Icon_Rows = /*#__PURE__*/ makeIcon(Rows, 'Rows');
const Icon_Rss = /*#__PURE__*/ makeIcon(Rss, 'Rss');
const Icon_Scroll = /*#__PURE__*/ makeIcon(Scroll, 'Scroll');
const Icon_ShareNetwork = /*#__PURE__*/ makeIcon(ShareNetwork, 'ShareNetwork');
const Icon_Shield = /*#__PURE__*/ makeIcon(Shield, 'Shield');
const Icon_ShieldCheck = /*#__PURE__*/ makeIcon(ShieldCheck, 'ShieldCheck');
const Icon_ShieldSlash = /*#__PURE__*/ makeIcon(ShieldSlash, 'ShieldSlash');
const Icon_ShieldWarning = /*#__PURE__*/ makeIcon(ShieldWarning, 'ShieldWarning');
const Icon_Shuffle = /*#__PURE__*/ makeIcon(Shuffle, 'Shuffle');
const Icon_SignIn = /*#__PURE__*/ makeIcon(SignIn, 'SignIn');
const Icon_SignOut = /*#__PURE__*/ makeIcon(SignOut, 'SignOut');
const Icon_SlidersHorizontal = /*#__PURE__*/ makeIcon(SlidersHorizontal, 'SlidersHorizontal');
const Icon_Smiley = /*#__PURE__*/ makeIcon(Smiley, 'Smiley');
const Icon_SortAscending = /*#__PURE__*/ makeIcon(SortAscending, 'SortAscending');
const Icon_SortDescending = /*#__PURE__*/ makeIcon(SortDescending, 'SortDescending');
const Icon_Sparkle = /*#__PURE__*/ makeIcon(Sparkle, 'Sparkle');
const Icon_SpeakerHigh = /*#__PURE__*/ makeIcon(SpeakerHigh, 'SpeakerHigh');
const Icon_SpeakerSlash = /*#__PURE__*/ makeIcon(SpeakerSlash, 'SpeakerSlash');
const Icon_SquaresFour = /*#__PURE__*/ makeIcon(SquaresFour, 'SquaresFour');
const Icon_Stack = /*#__PURE__*/ makeIcon(Stack, 'Stack');
const Icon_Star = /*#__PURE__*/ makeIcon(Star, 'Star');
const Icon_Storefront = /*#__PURE__*/ makeIcon(Storefront, 'Storefront');
const Icon_SuitcaseRolling = /*#__PURE__*/ makeIcon(SuitcaseRolling, 'SuitcaseRolling');
const Icon_Sun = /*#__PURE__*/ makeIcon(Sun, 'Sun');
const Icon_SunDim = /*#__PURE__*/ makeIcon(SunDim, 'SunDim');
const Icon_SunHorizon = /*#__PURE__*/ makeIcon(SunHorizon, 'SunHorizon');
const Icon_Sword = /*#__PURE__*/ makeIcon(Sword, 'Sword');
const Icon_TShirt = /*#__PURE__*/ makeIcon(TShirt, 'TShirt');
const Icon_Target = /*#__PURE__*/ makeIcon(Target, 'Target');
const Icon_TextAa = /*#__PURE__*/ makeIcon(TextAa, 'TextAa');
const Icon_TextB = /*#__PURE__*/ makeIcon(TextB, 'TextB');
const Icon_TextT = /*#__PURE__*/ makeIcon(TextT, 'TextT');
const Icon_Timer = /*#__PURE__*/ makeIcon(Timer, 'Timer');
const Icon_Translate = /*#__PURE__*/ makeIcon(Translate, 'Translate');
const Icon_Trash = /*#__PURE__*/ makeIcon(Trash, 'Trash');
const Icon_TrashSimple = /*#__PURE__*/ makeIcon(TrashSimple, 'TrashSimple');
const Icon_Tree = /*#__PURE__*/ makeIcon(Tree, 'Tree');
const Icon_TrendDown = /*#__PURE__*/ makeIcon(TrendDown, 'TrendDown');
const Icon_TrendUp = /*#__PURE__*/ makeIcon(TrendUp, 'TrendUp');
const Icon_Trophy = /*#__PURE__*/ makeIcon(Trophy, 'Trophy');
const Icon_UploadSimple = /*#__PURE__*/ makeIcon(UploadSimple, 'UploadSimple');
const Icon_User = /*#__PURE__*/ makeIcon(User, 'User');
const Icon_UserCircle = /*#__PURE__*/ makeIcon(UserCircle, 'UserCircle');
const Icon_UserMinus = /*#__PURE__*/ makeIcon(UserMinus, 'UserMinus');
const Icon_UserPlus = /*#__PURE__*/ makeIcon(UserPlus, 'UserPlus');
const Icon_Users = /*#__PURE__*/ makeIcon(Users, 'Users');
const Icon_Vibrate = /*#__PURE__*/ makeIcon(Vibrate, 'Vibrate');
const Icon_VideoCamera = /*#__PURE__*/ makeIcon(VideoCamera, 'VideoCamera');
const Icon_Warning = /*#__PURE__*/ makeIcon(Warning, 'Warning');
const Icon_WarningCircle = /*#__PURE__*/ makeIcon(WarningCircle, 'WarningCircle');
const Icon_Waves = /*#__PURE__*/ makeIcon(Waves, 'Waves');
const Icon_WifiHigh = /*#__PURE__*/ makeIcon(WifiHigh, 'WifiHigh');
const Icon_WifiSlash = /*#__PURE__*/ makeIcon(WifiSlash, 'WifiSlash');
const Icon_Wind = /*#__PURE__*/ makeIcon(Wind, 'Wind');
const Icon_Wrench = /*#__PURE__*/ makeIcon(Wrench, 'Wrench');
const Icon_X = /*#__PURE__*/ makeIcon(X, 'X');

export {
  Icon_Pulse as Activity,
  Icon_TextAa as ALargeSmall,
  Icon_WarningCircle as AlertCircle,
  Icon_Warning as AlertTriangle,
  Icon_Archive as Archive,
  Icon_Archive as ArchiveRestore,
  Icon_ArrowDown as ArrowDown,
  Icon_SortAscending as ArrowDownAZ,
  Icon_SortAscending as ArrowDownNarrowWide,
  Icon_SortDescending as ArrowDownWideNarrow,
  Icon_ArrowLeft as ArrowLeft,
  Icon_ArrowRight as ArrowRight,
  Icon_SortAscending as ArrowUpNarrowWide,
  Icon_SortDescending as ArrowUpWideNarrow,
  Icon_Medal as Award,
  Icon_ChartBar as BarChart3,
  Icon_Bed as BedDouble,
  Icon_Bell as Bell,
  Icon_BellSlash as BellOff,
  Icon_BellRinging as BellRing,
  Icon_Binoculars as Binoculars,
  Icon_TextB as Bold,
  Icon_BookmarkSimple as Bookmark,
  Icon_BookmarkSimple as BookmarkCheck,
  Icon_BookBookmark as BookMarked,
  Icon_BookOpen as BookOpen,
  Icon_Robot as Bot,
  Icon_Brain as Brain,
  Icon_Buildings as Building,
  Icon_Bus as Bus,
  Icon_Calculator as Calculator,
  Icon_Calendar as Calendar,
  Icon_CalendarDots as CalendarDays,
  Icon_Calendar as CalendarIcon,
  Icon_Camera as Camera,
  Icon_Car as Car,
  Icon_Carrot as Carrot,
  Icon_Check as Check,
  Icon_Checks as CheckCheck,
  Icon_CheckCircle as CheckCircle,
  Icon_CheckCircle as CheckCircle2,
  Icon_Cherries as Cherry,
  Icon_CaretDown as ChevronDown,
  Icon_CaretLeft as ChevronLeft,
  Icon_CaretRight as ChevronRight,
  Icon_CaretDoubleDown as ChevronsDown,
  Icon_CaretDoubleUp as ChevronsUp,
  Icon_CaretUp as ChevronUp,
  Icon_Circle as Circle,
  Icon_CheckCircle as CircleCheck,
  Icon_Orange as Citrus,
  Icon_Clipboard as Clipboard,
  Icon_Clipboard as ClipboardCopy,
  Icon_Clock as Clock,
  Icon_Cloud as Cloud,
  Icon_CloudRain as CloudDrizzle,
  Icon_CloudFog as CloudFog,
  Icon_CloudLightning as CloudLightning,
  Icon_CloudRain as CloudRain,
  Icon_CloudSnow as CloudSnow,
  Icon_CloudSun as CloudSun,
  Icon_Cloud as Cloudy,
  Icon_Coffee as Coffee,
  Icon_Compass as Compass,
  Icon_CircleHalf as Contrast,
  Icon_Cookie as Cookie,
  Icon_Copy as Copy,
  Icon_ArrowElbowDownLeft as CornerDownLeft,
  Icon_Crosshair as Crosshair,
  Icon_Crown as Crown,
  Icon_Database as Database,
  Icon_DiceFive as Dices,
  Icon_DoorOpen as DoorOpen,
  Icon_DownloadSimple as Download,
  Icon_Drop as Droplet,
  Icon_Drop as Droplets,
  Icon_Barbell as Dumbbell,
  Icon_Egg as Egg,
  Icon_Eraser as Eraser,
  Icon_ArrowSquareOut as ExternalLink,
  Icon_Eye as Eye,
  Icon_EyeSlash as EyeOff,
  Icon_Feather as Feather,
  Icon_FileText as FileText,
  Icon_Funnel as Filter,
  Icon_Fish as Fish,
  Icon_Flag as Flag,
  Icon_Flame as Flame,
  Icon_Flask as FlaskConical,
  Icon_FolderOpen as FolderOpen,
  Icon_ArrowBendUpRight as Forward,
  Icon_GameController as Gamepad2,
  Icon_Gauge as Gauge,
  Icon_Globe as Globe,
  Icon_GridNine as Grid3X3,
  Icon_HandHeart as HandHeart,
  Icon_HardDrive as HardDrive,
  Icon_Hash as Hash,
  Icon_Heart as Heart,
  Icon_Question as HelpCircle,
  Icon_ClockCounterClockwise as History,
  Icon_House as Home,
  Icon_House as House,
  Icon_Image as Image,
  Icon_Image as ImageIcon,
  Icon_ImageBroken as ImageOff,
  Icon_Info as Info,
  Icon_Key as Key,
  Icon_Bank as Landmark,
  Icon_Translate as Languages,
  Icon_Stack as Layers,
  Icon_SquaresFour as LayoutGrid,
  Icon_Leaf as Leaf,
  Icon_Books as Library,
  Icon_Books as LibraryBig,
  Icon_Lightbulb as Lightbulb,
  Icon_Link as Link2,
  Icon_List as List,
  Icon_CircleNotch as Loader2,
  Icon_Lock as Lock,
  Icon_SignIn as LogIn,
  Icon_SignOut as LogOut,
  Icon_SuitcaseRolling as Luggage,
  Icon_MapTrifold as Map,
  Icon_MapPin as MapPin,
  Icon_ArrowsOut as Maximize2,
  Icon_ChatCircle as MessageCircle,
  Icon_ChatText as MessageSquareText,
  Icon_Microphone as Mic,
  Icon_Minus as Minus,
  Icon_Moon as Moon,
  Icon_MoonStars as MoonStar,
  Icon_DotsThree as MoreHorizontal,
  Icon_DotsThreeVertical as MoreVertical,
  Icon_Mountains as Mountain,
  Icon_NavigationArrow as Navigation,
  Icon_ShareNetwork as Network,
  Icon_Newspaper as Newspaper,
  Icon_PaintBrush as Paintbrush,
  Icon_Palette as Palette,
  Icon_Pause as Pause,
  Icon_PencilSimple as Pencil,
  Icon_PencilSimpleLine as PenLine,
  Icon_PiggyBank as PiggyBank,
  Icon_PushPin as Pin,
  Icon_PushPinSlash as PinOff,
  Icon_Airplane as Plane,
  Icon_Play as Play,
  Icon_Plus as Plus,
  Icon_PuzzlePiece as Puzzle,
  Icon_Quotes as Quote,
  Icon_ArrowsCounterClockwise as RefreshCcw,
  Icon_ArrowsClockwise as RefreshCw,
  Icon_Repeat as Repeat,
  Icon_ArrowBendUpLeft as Reply,
  Icon_ArrowCounterClockwise as RotateCcw,
  Icon_ArrowClockwise as RotateCw,
  Icon_Path as Route,
  Icon_Rows as Rows3,
  Icon_Rss as Rss,
  Icon_BowlFood as Salad,
  Icon_FloppyDisk as Save,
  Icon_Scroll as ScrollText,
  Icon_MagnifyingGlass as Search,
  Icon_PaperPlaneTilt as Send,
  Icon_GearSix as Settings,
  Icon_Gear as Settings2,
  Icon_ShareNetwork as Share2,
  Icon_Shield as Shield,
  Icon_ShieldWarning as ShieldAlert,
  Icon_ShieldCheck as ShieldCheck,
  Icon_ShieldSlash as ShieldOff,
  Icon_TShirt as Shirt,
  Icon_Shuffle as Shuffle,
  Icon_SlidersHorizontal as SlidersHorizontal,
  Icon_DeviceMobile as Smartphone,
  Icon_Smiley as Smile,
  Icon_Sparkle as Sparkles,
  Icon_Plant as Sprout,
  Icon_Star as Star,
  Icon_Storefront as Store,
  Icon_Sun as Sun,
  Icon_SunDim as SunDim,
  Icon_SunHorizon as Sunrise,
  Icon_SunHorizon as Sunset,
  Icon_Sword as Swords,
  Icon_Target as Target,
  Icon_Timer as Timer,
  Icon_Timer as TimerOff,
  Icon_Trash as Trash,
  Icon_TrashSimple as Trash2,
  Icon_Tree as Trees,
  Icon_TrendDown as TrendingDown,
  Icon_TrendUp as TrendingUp,
  Icon_Trophy as Trophy,
  Icon_TextT as Type,
  Icon_ArrowArcLeft as Undo2,
  Icon_LockOpen as Unlock,
  Icon_UploadSimple as Upload,
  Icon_User as User,
  Icon_User as User2,
  Icon_UserCircle as UserCircle,
  Icon_UserMinus as UserMinus,
  Icon_UserPlus as UserPlus,
  Icon_Users as Users,
  Icon_ForkKnife as Utensils,
  Icon_ForkKnife as UtensilsCrossed,
  Icon_Vibrate as Vibrate,
  Icon_VideoCamera as Video,
  Icon_SpeakerHigh as Volume2,
  Icon_SpeakerSlash as VolumeX,
  Icon_Waves as Waves,
  Icon_Grains as Wheat,
  Icon_WifiHigh as Wifi,
  Icon_WifiSlash as WifiOff,
  Icon_Wind as Wind,
  Icon_Wrench as Wrench,
  Icon_X as X,
  Icon_Lightning as Zap,
  Icon_MagnifyingGlassPlus as ZoomIn,
  Icon_MagnifyingGlassMinus as ZoomOut,
};

/**
 * Fallback: any lucide icon name we did not explicitly map above keeps coming
 * from lucide-react. Explicit named exports above always take precedence.
 */
export * from 'lucide-react';
