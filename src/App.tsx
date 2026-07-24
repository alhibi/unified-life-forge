import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { VoicePlayerProvider } from "@/contexts/VoicePlayerContext";
import { ImageUploadProvider } from "@/contexts/ImageUploadContext";
import { PodcastPlayerProvider } from "@/features/podcasts/contexts/PodcastPlayerContext";
import PodcastMiniPlayer from "@/features/podcasts/components/PodcastMiniPlayer";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import PageTransition, { NavModeContext } from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { IconProvider } from "@/lib/icons";
import { useAutoPrayerTheme } from "@/hooks/useAutoPrayerTheme";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";
import { useNavDirection } from "@/hooks/useNavDirection";
import { navStart } from "@/lib/navPerf";
import { buildTabLayerVariants, type NavMode } from "@/lib/motion";
import { useInChatConversation } from "@/lib/inChatConversation";
import EdgeSwipeBack from "@/components/EdgeSwipeBack";
import { registerRoute } from "@/lib/routePrefetch";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SystemEngineProvider, useSystemEngine } from "@/contexts/SystemEngineContext";
import { usePredictivePrefetch } from "@/hooks/usePredictivePrefetch";
import { CommandPalette } from "@/components/CommandPalette";
import { Layout } from "lucide-react";

// Eager load the main page
import Index from "./pages/Index";
// Tab pages that stay mounted across navigation are eager-imported so
// switching between bottom-nav tabs feels instant (no remount/refetch).
// The new IA reorganisation kept only three persistent tabs (Home,
// Games, Chat). Heavier hubs (Wellness, Mihrab, Browse) and the
// `/diwan` redirect are routed lazily below — see the comments on
// `loadWellness` / `loadMihrab` / `loadBrowse`.
import GamesPage from "./features/games/pages/Games";
import ChatPage from "./pages/Chat";
import { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";

function AutoPrayerThemeRunner() {
  useAutoPrayerTheme();
  return null;
}

function PresenceRunner() {
  const { user } = useAuth();
  usePresence(user?.id);
  return null;
}

function NetworkConnectivityListener() {
  const { language } = useApp();
  const isAr = language === 'ar';

  useEffect(() => {
    const handleOnline = () => {
      const message = isAr
        ? 'تم استعادة الاتصال بالشبكة بنجاح.'
        : 'Netzwerkverbindung erfolgreich wiederhergestellt.';
      import('sonner').then(({ toast }) => {
        toast.success(message, {
          id: 'network-status',
          duration: 4000,
        });
      });
    };

    const handleOffline = () => {
      const message = isAr
        ? 'فقد الاتصال بالشبكة. التطبيق يعمل الآن في وضع عدم الاتصال.'
        : 'Netzwerkverbindung verloren. Die App läuft jetzt offline.';
      import('sonner').then(({ toast }) => {
        toast.error(message, {
          id: 'network-status',
          duration: 5000,
        });
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAr]);

  return null;
}

// Lazy load all non-tab pages
// Lazy loaders are kept as named factories so we can prefetch them on idle.
const loadSudoku = () => import("./features/games/pages/Sudoku");
const loadChess = () => import("./features/games/pages/Chess");
const loadMemory = () => import("./features/games/pages/MemoryGame");
const loadDice = () => import("./features/games/pages/DiceGame");
const loadFocus = () => import("./features/games/pages/FocusGame");
const loadChessPuzzle = () => import("./features/games/pages/ChessPuzzle");
const loadChessCareer = () => import("./features/games/pages/ChessCareer");
const loadMemoryAdventure = () => import("./features/games/pages/MemoryAdventure");
const loadDiceTournament = () => import("./features/games/pages/DiceTournament");
const loadFocusDecathlon = () => import("./features/games/pages/FocusDecathlon");
const loadSettings = () => import("./pages/Settings");
const loadDuas = () => import("./features/duas/pages/Duas");
// Wave-1 chat surface — three new lazy pages backed by the new
// data layer. Kept off the eager bundle since group/channel chats
// and chat settings are reachable only via deep-link or via the
// "Groups & Channels" entry in the legacy chat list.
const loadGroupsIndex   = () => import("./pages/GroupsIndex");
const loadGroupChat     = () => import("./pages/GroupChat");
const loadChatSettings  = () => import("./pages/ChatSettings");
const loadTheme = () => import("./pages/ThemeSettings");
const loadAuth = () => import("./pages/Auth");
const loadProfile = () => import("./pages/ProfileEdit");
const loadFont = () => import("./pages/FontSettings");
const loadMotion = () => import("./pages/MotionSettings");
const loadPrayer = () => import("./pages/PrayerSettings");
const loadOccasions = () => import("./features/calendar/pages/AllOccasions");
const loadReading = () => import("./pages/Reading");
const loadTimed = () => import("./pages/TimedSunnah");
const loadSunnahDetail = () => import("./pages/SunnahDetail");
const loadProphetic = () => import("./pages/PropheticDay");
const loadUntimed = () => import("./pages/UntimedSunnah");
const loadVirtues = () => import("./pages/QuranVirtues");
const loadTafsir = () => import("./pages/Tafsir");
const loadPodcasts = () => import("./features/podcasts/pages/Podcasts");
const loadPodcastDetail = () => import("./features/podcasts/pages/PodcastDetail");
const loadPodcastLibrary = () => import("./features/podcasts/pages/PodcastLibrary");
const loadPodcastHistory = () => import("./features/podcasts/pages/History");
const loadNotFound = () => import("./pages/NotFound");
// Wellness and Diwan tabs are lazy because their static data files
// (~10k lines combined) make eager-loading them measurable on cold
// homepage paint. The bottom nav still highlights them and the tap
// switches the route normally — first visit pays a brief skeleton,
// subsequent visits hit React.lazy's module cache and are instant.
const loadWellness = () => import("./pages/Wellness");
const loadDiwan = () => import("./features/diwan/pages/Diwan");
// Hubs introduced by the IA reorganisation: `/browse` ("اطلاع")
// groups Podcasts + Articles, `/mihrab` groups Quran/Dhikr/Sunnah/
// Literature. Both are lightweight landings on top of the existing
// deep pages, so they're lazy-loaded — they should not pay any
// cost on cold home paint.
const loadBrowse = () => import("./pages/Browse");
const loadMihrab = () => import("./pages/Mihrab");
// Weather hub — comprehensive 7-day forecast + details view reachable
// from the bottom nav. Lazy because the home page already shows a tiny
// `WeatherWidget` and most users won't drill into the full hub on every
// session; the prefetch on idle warms it up so the first tap is fast.
const loadWeather = () => import("./weather/pages/Weather");
// Knowledge hub — "المعرفة": a self-contained luxury catalog (cars,
// perfumes, watches, fashion, sweets). Lazy because its rich static
// data set should not weigh on the cold home paint; it's prefetched on
// idle so the first tap from the bottom nav renders instantly.
const loadKnowledge = () => import("./features/knowledge/pages/Knowledge");
// Long-form SEO guide to Islamic prayer (Salah). Lightweight static
// page reachable from /mihrab — kept lazy because it's only loaded
// when a user (or a crawler) drills in from the Mihrab hub.
const loadPrayerGuide = () => import("./pages/PrayerGuide");
// Diwan library — adab.com integration
const loadLibrary = () => import("./features/diwan/pages/Library");
const loadLibraryPoets = () => import("./features/diwan/pages/LibraryPoets");
const loadLibraryPoet = () => import("./features/diwan/pages/LibraryPoet");
const loadLibraryPoem = () => import("./features/diwan/pages/LibraryPoem");
const loadLibrarySearch = () => import("./features/diwan/pages/LibrarySearch");
const loadLibraryFavorites = () => import("./features/diwan/pages/LibraryFavorites");
// Universal Knowledge Archive — long-form AI-generated monographs, filed
// with an accession number, searchable, and rendered in a serif reader.
const loadArchiveHome   = () => import("./features/archive/pages/ArchiveHome");
const loadArchiveNew    = () => import("./features/archive/pages/ArchiveNew");
const loadArchiveReader = () => import("./features/archive/pages/ArchiveReader");
// PKM — local-first personal knowledge base (MVP).
const loadPKM = () => import("./features/pkm/pages/PKM");
// Living Mind — dedicated contemplative 3D destination for PKM.
const loadMind = () => import("./features/mind/pages/Mind");
// "مذكرتي" — journal with 3D brain hero.
const loadJournal = () => import("./features/journal/pages/JournalHome");
const loadTravelAtlas = () => import("./features/travel-atlas/pages/TravelAtlasPage");
const loadTravelMap = () => import("./features/travel-atlas/pages/CountryMapPage");
const loadOAuthConsent = () => import("./pages/OAuthConsent");

// ──────────────────────────────────────────────────────────────────────
// Register every lazy route in the central prefetch registry so any
// in-app intent surface (BottomNav pointerdown, NavLink hover, smart
// back, etc.) can warm the module ahead of the actual navigation. The
// registry de-dupes loaders, so this is safe to call from anywhere.
// Persistent tab paths (`/`, `/games`, `/chat`) are intentionally NOT
// registered — they are eager and already mounted.
// ──────────────────────────────────────────────────────────────────────
registerRoute('/settings',          loadSettings);
registerRoute('/settings/theme',    loadTheme);
registerRoute('/settings/profile',  loadProfile);
registerRoute('/profile',           loadProfile);
registerRoute('/settings/font',     loadFont);
registerRoute('/settings/motion',   loadMotion);
registerRoute('/settings/prayer',   loadPrayer);
registerRoute('/auth',              loadAuth);
registerRoute('/duas',              loadDuas);
registerRoute('/wellness',          loadWellness);
registerRoute('/diwan',             loadDiwan);
registerRoute('/browse',            loadBrowse);
registerRoute('/mihrab',            loadMihrab);
registerRoute('/mihrab/prayer-guide', loadPrayerGuide);
registerRoute('/weather',           loadWeather);
registerRoute('/knowledge',         loadKnowledge);
registerRoute('/journal',           loadJournal);
registerRoute('/travel-atlas',      loadTravelAtlas);
registerRoute('/travel-atlas/:countryId', loadTravelMap);
registerRoute('/reading',           loadReading);
registerRoute('/occasions',         loadOccasions);
registerRoute('/tafsir',            loadTafsir);
registerRoute('/podcasts',          loadPodcasts);
registerRoute('/podcasts/library',  loadPodcastLibrary);
registerRoute('/podcasts/:id',      loadPodcastDetail);
registerRoute('/podcasts/history', loadPodcastHistory);
registerRoute('/chat/groups',       loadGroupsIndex);
registerRoute('/chat/settings',     loadChatSettings);
registerRoute('/chat/g/:chatId',    loadGroupChat);
registerRoute('/section/timed-sunnah',         loadTimed);
registerRoute('/section/timed-sunnah/:categoryId', loadSunnahDetail);
registerRoute('/section/untimed-sunnah',       loadUntimed);
registerRoute('/section/prophetic-day',        loadProphetic);
registerRoute('/section/quran-virtues',        loadVirtues);
registerRoute('/games/sudoku',            loadSudoku);
registerRoute('/games/chess',             loadChess);
registerRoute('/games/chess/puzzles',     loadChessPuzzle);
registerRoute('/games/chess/career',      loadChessCareer);
registerRoute('/games/memory',            loadMemory);
registerRoute('/games/memory/adventure',  loadMemoryAdventure);
registerRoute('/games/dice',              loadDice);
registerRoute('/games/dice/tournament',   loadDiceTournament);
registerRoute('/games/focus',             loadFocus);
registerRoute('/games/focus/decathlon',   loadFocusDecathlon);
registerRoute('/diwan/library',           loadLibrary);
registerRoute('/diwan/library/search',    loadLibrarySearch);
registerRoute('/diwan/library/poets',     loadLibraryPoets);
registerRoute('/diwan/library/poet/:slug', loadLibraryPoet);
registerRoute('/diwan/library/poem/:slug', loadLibraryPoem);
registerRoute('/diwan/library/favorites', loadLibraryFavorites);
registerRoute('/archive',        loadArchiveHome);
registerRoute('/archive/new',    loadArchiveNew);
registerRoute('/archive/:id',    loadArchiveReader);
registerRoute('/pkm',            loadPKM);
registerRoute('/pkm/mind',       loadMind);

const SudokuPage = lazy(loadSudoku);
const ChessPage = lazy(loadChess);
const MemoryGame = lazy(loadMemory);
const DiceGamePage = lazy(loadDice);
const FocusGamePage = lazy(loadFocus);
const ChessPuzzlePage = lazy(loadChessPuzzle);
const ChessCareerPage = lazy(loadChessCareer);
const MemoryAdventurePage = lazy(loadMemoryAdventure);
const DiceTournamentPage = lazy(loadDiceTournament);
const FocusDecathlonPage = lazy(loadFocusDecathlon);
const SettingsPage = lazy(loadSettings);
const DuasPage = lazy(loadDuas);
const GroupsIndexPage   = lazy(loadGroupsIndex);
const GroupChatPage     = lazy(loadGroupChat);
const ChatSettingsPage  = lazy(loadChatSettings);
const ThemeSettingsPage = lazy(loadTheme);
const AuthPage = lazy(loadAuth);
const ProfileEditPage = lazy(loadProfile);
const FontSettingsPage = lazy(loadFont);
const MotionSettingsPage = lazy(loadMotion);
const PrayerSettingsPage = lazy(loadPrayer);
const AllOccasionsPage = lazy(loadOccasions);
const ReadingPage = lazy(loadReading);
const TimedSunnahPage = lazy(loadTimed);
const SunnahDetailPage = lazy(loadSunnahDetail);
const PropheticDayPage = lazy(loadProphetic);
const UntimedSunnahPage = lazy(loadUntimed);
const QuranVirtuesPage = lazy(loadVirtues);
const TafsirPage = lazy(loadTafsir);
const PodcastsPage = lazy(loadPodcasts);
const PodcastDetailPage = lazy(loadPodcastDetail);
const PodcastLibraryPage = lazy(loadPodcastLibrary);
const PodcastHistoryPage = lazy(loadPodcastHistory);
const NotFound = lazy(loadNotFound);
const WellnessPage = lazy(loadWellness);
const DiwanPage = lazy(loadDiwan);
const BrowsePage = lazy(loadBrowse);
const MihrabPage = lazy(loadMihrab);
const WeatherPage = lazy(loadWeather);
const KnowledgePage = lazy(loadKnowledge);
const JournalPage = lazy(loadJournal);
const TravelAtlasPage = lazy(loadTravelAtlas);
const TravelMapPage = lazy(loadTravelMap);
const PrayerGuidePage = lazy(loadPrayerGuide);
const DiwanLibraryPage = lazy(loadLibrary);
const DiwanLibraryPoetsPage = lazy(loadLibraryPoets);
const DiwanLibraryPoetPage = lazy(loadLibraryPoet);
const DiwanLibraryPoemPage = lazy(loadLibraryPoem);
const DiwanLibrarySearchPage = lazy(loadLibrarySearch);
const DiwanLibraryFavoritesPage = lazy(loadLibraryFavorites);
const ArchiveHomePage   = lazy(loadArchiveHome);
const ArchiveNewPage    = lazy(loadArchiveNew);
const ArchiveReaderPage = lazy(loadArchiveReader);
const PKMPage           = lazy(loadPKM);
const MindPage          = lazy(loadMind);
const OAuthConsentPage  = lazy(loadOAuthConsent);

// Tab pages are now eager (always mounted), so the idle prefetch warms
// the next most-likely sub-routes instead of the tabs themselves.
// Wellness and Diwan are lazy now too, so we prefetch them on idle so the
// first tap doesn't pay the network/parse cost in the foreground.
function useIdlePrefetch() {
  useEffect(() => {
    const ric: (cb: () => void) => number =
      (window as any).requestIdleCallback ||
      ((cb) => window.setTimeout(cb, 1500));
    const id = ric(() => {
      loadTheme(); loadProfile(); loadPrayer(); loadReading();
      loadWellness(); loadDiwan();
      // Wave-1 chat surfaces. The groups index is one tap away from the
      // chat tab and the chat settings page is one tap away from there;
      // pre-warming both keeps the first navigation instant.
      loadGroupsIndex(); loadChatSettings();
      // The new IA hubs are the most likely first taps on every cold
      // session, so warm them up alongside the existing tabs. Settings
      // is now reached from the home avatar shortcut, so prefetch it
      // too — the user is one tap away.
      loadBrowse(); loadMihrab(); loadSettings();
      // Weather hub is in the bottom nav alongside Browse/Mihrab; warm
      // it up on idle so the first tap renders instantly.
      loadWeather();
      // Knowledge hub is a bottom-nav tab too — prefetch it so the
      // first tap doesn't pay the chunk download in the foreground.
      loadKnowledge();
    });
    return () => {
      const cic = (window as any).cancelIdleCallback;
      if (cic) cic(id); else clearTimeout(id);
    };
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});


// Skeleton fallback matching app layout
const PageSkeleton = () => (
  <div className="min-h-screen p-4 space-y-4">
    <div className="skeleton h-8 w-40 mx-auto" />
    <div className="skeleton h-24 w-full" />
    <div className="skeleton h-16 w-full" />
    <div className="skeleton h-16 w-full" />
    <div className="skeleton h-32 w-full" />
  </div>
);

// All paths where BottomNav is visible — used to decide whether
// <main> should reserve space at the bottom for the nav bar.
// Must stay in sync with the `tabs` array in BottomNav.tsx.
const ALL_NAV_PATHS = new Set([
  '/', '/games', '/chat', '/wellness', '/weather', '/browse', '/mihrab', '/knowledge',
]);

// Tab routes that stay mounted across navigation. Their components are
// rendered once in <PersistentTabs/> and toggled with display:none — never
// unmounted. This makes bottom-nav switching feel native and instant.
//
// The IA reorganisation reduced this set to the three small, hot tabs
// the user touches all the time: Home, Games, Chat. Wellness, Browse,
// and Mihrab are top-level destinations too (they appear in the bottom
// nav) but are heavier; they are lazy non-persistent routes below so
// their cold-paint cost stays off the home page. Their `display:none`
// on first paint would have kept their data fetches running anyway,
// so making them route-rendered is the right trade-off.
const TAB_PATHS = ['/', '/games', '/chat'] as const;
type TabPath = typeof TAB_PATHS[number];

function PersistentTabs({ active, mode }: { active: TabPath | null; mode: NavMode }) {
  // ────────────────────────────────────────────────────────────────
  // Strict push/pop tab layer
  //
  // Previously we toggled the persistent tab layer with a manual
  // opacity transition while the incoming sub-page slid in from the
  // edge — that produced a visible "fade-while-slide" overlap which
  // breaks the strict L→R / R→L navigation rule.
  //
  // The new approach plugs the tab layer into AnimatePresence with
  // the same push/pop variants we use for any other page. When the
  // user pushes from a tab to a sub-page, the layer slides off at the
  // parallax ratio in the OPPOSITE direction of the incoming page —
  // exactly like a native UINavigationController push. When the user
  // pops back, the layer slides in from the same edge with the
  // appropriate parallax. Tab→tab swaps stay instant because the
  // AnimatePresence key never changes (only the inner slot toggles
  // via display:none).
  //
  // Key invariants:
  //   • the AnimatePresence key is the constant string "tab-layer".
  //     This is what keeps the wrapper alive across tab→tab swaps.
  //   • the inner slot for the currently-shown tab is rendered with
  //     display:block; siblings are display:none so they stay
  //     mounted (instant return on next visit).
  //   • the wrapper exits ONLY when active becomes null (i.e., the
  //     user navigated to a deep sub-page). On unmount it follows the
  //     push/pop slide rule via motion variants.
  //   • Tab→tab swaps trigger the `tab-zoom-in` keyframe on the
  //     newly-shown slot — a tiny 200 ms vertical fade-up so the
  //     change registers without a horizontal slide.
  // ────────────────────────────────────────────────────────────────
  const { dir } = useApp();
  const rtl = dir === 'rtl';
  const prefersReducedMotion = useReducedMotion();
  // Track which tab to display while the layer is mounted. We keep a
  // ref-like memo of the last non-null `active` so during the exit
  // animation (active just became null) we still render the tab the
  // user came from instead of flashing empty content.
  const [lastTab, setLastTab] = useState<TabPath | null>(active);
  useEffect(() => {
    if (active !== null) setLastTab(active);
  }, [active]);

  const variants = useMemo(
    () => (prefersReducedMotion
      ? {
          initial: { opacity: 0, x: 0 },
          animate: { opacity: 1, x: 0, transition: { duration: 0.10, ease: 'linear' as const } },
          exit:    { opacity: 0, x: 0, transition: { duration: 0.07, ease: 'linear' as const } },
        }
      : buildTabLayerVariants(rtl)),
    [rtl, prefersReducedMotion],
  );

  const showing: TabPath | null = active ?? lastTab;

  const slot = (path: TabPath, node: React.ReactNode) => (
    <div
      key={path}
      style={{ display: showing === path ? 'block' : 'none' }}
      aria-hidden={showing !== path}
    >
      <ErrorBoundary>
        {showing === path && active !== null ? (
          // Tab→tab swap micro-motion. Skipped during the exit phase
          // (active === null) so we don't fight the wrapper's slide.
          <div
            key={`tab-anim-${path}`}
            className="tab-zoom-in"
            style={{ willChange: 'opacity, transform' }}
          >
            {node}
          </div>
        ) : (
          node
        )}
      </ErrorBoundary>
    </div>
  );

  return (
    <AnimatePresence initial={false} custom={mode}>
      {active !== null && (
        <motion.div
          key="tab-layer"
          data-tab-layer="true"
          custom={mode}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            // Layout: take normal flow while present so child content
            // drives <main>'s height. AnimatePresence handles unmount.
            position: 'relative',
            top: 0,
            left: 0,
            right: 0,
            // Lock GPU compositing — same hints as PageTransition so
            // the layer rides the same fast-path on iOS Safari /
            // ProMotion displays.
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            zIndex: 0,
          }}
        >
          {slot('/',      <Index />)}
          {slot('/games', <GamesPage />)}
          {slot('/chat',  <ChatPage />)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { language } = useApp();
  const isAr = language === 'ar';

  useIdlePrefetch();
  usePredictivePrefetch(); // Global Pointer-Intent & Trajectory Predictive Prefetching Engine

  const { splitActive, splitUrl, splitSize, setSplitSize, splitLayout, setSplitActive } = useSystemEngine();
  const isSplitPane = new URLSearchParams(location.search).get('is_split_pane') === 'true';
  const effectiveSplitActive = splitActive && !isSplitPane;

  // Mark the navigation start timestamp synchronously ONCE per route change.
  // Calling navStart() in render fired on every re-render (theme tick,
  // presence flip, etc.) and reset the baseline mid-flight — paint timings
  // were polluted. useLayoutEffect runs exactly once per pathname change,
  // before paint, which is what the perf logger expects.
  useLayoutEffect(() => {
    navStart(location.pathname);
  }, [location.pathname]);
  // Classify the navigation as push / pop / tab / replace / initial so
  // PageTransition can pick the right slide direction (and so OUTGOING
  // pages know whether to leave to the left or right with parallax).
  const { mode } = useNavDirection();
  const inChatConversation = useInChatConversation();
  const activeTab = (TAB_PATHS as readonly string[]).includes(location.pathname)
    ? (location.pathname as TabPath)
    : null;
  // Show bottom padding on ALL nav-tab routes (not just persistent tabs)
  // so the BottomNav never overlaps page content.
  // ...except inside a 1:1 chat conversation, where the BottomNav is hidden
  // by inChatConversation — without this guard <main> reserved a 62px dead
  // strip below the chat composer.
  const navVisible = ALL_NAV_PATHS.has(location.pathname) && !inChatConversation;

  const mainStyle = effectiveSplitActive
    ? {
        position: 'relative' as const,
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
      }
    : {
        // Provide a positioning context so the exiting PageTransition
        // (which sets `position: absolute` during exit) is pinned to
        // <main>'s box and never stacks above the incoming page.
        position: 'relative' as const,
        // Reserve space for the bottom nav on all routes where it is
        // visible. Sub-pages (non-nav routes) do NOT render BottomNav
        // so they don't need the bottom padding.
        paddingBottom: navVisible
          ? `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
          : 0,
        // Minimum height ensures content fills viewport even on short pages
        minHeight: '100dvh',
      };

  const primaryContent = (
    <div className={effectiveSplitActive ? "h-full overflow-y-auto pb-20 scrollbar-thin" : ""}>
      <PersistentTabs active={activeTab} mode={mode} />
      {/* Non-tab routes (sub-pages, settings details, games, etc.) */}
      {/* AnimatePresence must own PageTransition directly. Wrapping
          <Routes> itself breaks popLayout because Routes cannot receive
          the ref Framer needs to remove the outgoing screen from layout.
          Suspense lives INSIDE PageTransition so a lazy chunk's fallback
          renders within the animating layer instead of replacing it —
          otherwise the first visit to a lazy page skipped the transition
          entirely. */}
      <NavModeContext.Provider value={mode}>
        <AnimatePresence mode="popLayout" initial={false} custom={mode}>
          {activeTab === null && (
            <PageTransition key={location.pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Routes location={location}>
                  {/* Persistent tab paths are handled by <PersistentTabs/>. */}
                  <Route path="/" element={null} />
                  <Route path="/games" element={null} />
                  <Route path="/chat" element={null} />
                  {/* New chat surfaces (groups/channels + dedicated settings).
                      NOTE: order matters. /chat/groups must be matched BEFORE
                      /chat/g/:chatId so a literal "groups" segment isn't captured. */}
                  <Route path="/chat/groups" element={<ErrorBoundary><GroupsIndexPage /></ErrorBoundary>} />
                  <Route path="/chat/settings" element={<ErrorBoundary><ChatSettingsPage /></ErrorBoundary>} />
                  <Route path="/chat/g/:chatId" element={<ErrorBoundary><GroupChatPage /></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                  <Route path="/duas" element={<ErrorBoundary><DuasPage /></ErrorBoundary>} />
                  <Route path="/wellness" element={<ErrorBoundary><WellnessPage /></ErrorBoundary>} />
                  <Route path="/diwan" element={<ErrorBoundary><DiwanPage /></ErrorBoundary>} />
                  <Route path="/browse" element={<ErrorBoundary><BrowsePage /></ErrorBoundary>} />
                  <Route path="/mihrab" element={<ErrorBoundary><MihrabPage /></ErrorBoundary>} />
                  <Route path="/mihrab/prayer-guide" element={<ErrorBoundary><PrayerGuidePage /></ErrorBoundary>} />
                  <Route path="/weather" element={<ErrorBoundary><WeatherPage /></ErrorBoundary>} />
                  <Route path="/knowledge" element={<ErrorBoundary><KnowledgePage /></ErrorBoundary>} />
                  <Route path="/journal" element={<ErrorBoundary><JournalPage /></ErrorBoundary>} />
                  <Route path="/travel-atlas" element={<ErrorBoundary><TravelAtlasPage /></ErrorBoundary>} />
                  <Route path="/travel-atlas/:countryId" element={<ErrorBoundary><TravelMapPage /></ErrorBoundary>} />
                  <Route path="/games/sudoku" element={<ErrorBoundary><SudokuPage /></ErrorBoundary>} />
                  <Route path="/games/chess" element={<ErrorBoundary><ChessPage /></ErrorBoundary>} />
                  <Route path="/games/chess/puzzles" element={<ErrorBoundary><ChessPuzzlePage /></ErrorBoundary>} />
                  <Route path="/games/chess/career" element={<ErrorBoundary><ChessCareerPage /></ErrorBoundary>} />
                  <Route path="/games/memory" element={<ErrorBoundary><MemoryGame /></ErrorBoundary>} />
                  <Route path="/games/memory/adventure" element={<ErrorBoundary><MemoryAdventurePage /></ErrorBoundary>} />
                  <Route path="/games/dice" element={<ErrorBoundary><DiceGamePage /></ErrorBoundary>} />
                  <Route path="/games/dice/tournament" element={<ErrorBoundary><DiceTournamentPage /></ErrorBoundary>} />
                  <Route path="/games/focus" element={<ErrorBoundary><FocusGamePage /></ErrorBoundary>} />
                  <Route path="/games/focus/decathlon" element={<ErrorBoundary><FocusDecathlonPage /></ErrorBoundary>} />
                  <Route path="/occasions" element={<ErrorBoundary><AllOccasionsPage /></ErrorBoundary>} />
                  <Route path="/reading" element={<ErrorBoundary><ReadingPage /></ErrorBoundary>} />
                  <Route path="/settings/theme" element={<ErrorBoundary><ThemeSettingsPage /></ErrorBoundary>} />
                  <Route path="/auth" element={<ErrorBoundary><AuthPage /></ErrorBoundary>} />
                  <Route path="/settings/profile" element={<ErrorBoundary><ProfileEditPage /></ErrorBoundary>} />
                  <Route path="/profile" element={<ErrorBoundary><ProfileEditPage /></ErrorBoundary>} />
                  <Route path="/settings/font" element={<ErrorBoundary><FontSettingsPage /></ErrorBoundary>} />
                  <Route path="/settings/motion" element={<ErrorBoundary><MotionSettingsPage /></ErrorBoundary>} />
                  <Route path="/settings/prayer" element={<ErrorBoundary><PrayerSettingsPage /></ErrorBoundary>} />
                  <Route path="/section/timed-sunnah" element={<ErrorBoundary><TimedSunnahPage /></ErrorBoundary>} />
                  <Route path="/section/timed-sunnah/:categoryId" element={<ErrorBoundary><SunnahDetailPage /></ErrorBoundary>} />
                  <Route path="/section/untimed-sunnah" element={<ErrorBoundary><UntimedSunnahPage /></ErrorBoundary>} />
                  <Route path="/section/prophetic-day" element={<ErrorBoundary><PropheticDayPage /></ErrorBoundary>} />
                  <Route path="/section/quran-virtues" element={<ErrorBoundary><QuranVirtuesPage /></ErrorBoundary>} />
                  <Route path="/tafsir" element={<ErrorBoundary><TafsirPage /></ErrorBoundary>} />
                  <Route path="/podcasts" element={<ErrorBoundary><PodcastsPage /></ErrorBoundary>} />
                  <Route path="/podcasts/library" element={<ErrorBoundary><PodcastLibraryPage /></ErrorBoundary>} />
                  <Route path="/podcasts/history" element={<ErrorBoundary><PodcastHistoryPage /></ErrorBoundary>} />
                  <Route path="/podcasts/:id" element={<ErrorBoundary><PodcastDetailPage /></ErrorBoundary>} />
                  {/* Diwan Library — adab.com */}
                  <Route path="/diwan/library" element={<ErrorBoundary><DiwanLibraryPage /></ErrorBoundary>} />
                  <Route path="/diwan/library/search" element={<ErrorBoundary><DiwanLibrarySearchPage /></ErrorBoundary>} />
                  <Route path="/diwan/library/poets" element={<ErrorBoundary><DiwanLibraryPoetsPage /></ErrorBoundary>} />
                  <Route path="/diwan/library/poet/:slug" element={<ErrorBoundary><DiwanLibraryPoetPage /></ErrorBoundary>} />
                  <Route path="/diwan/library/poem/:slug" element={<ErrorBoundary><DiwanLibraryPoemPage /></ErrorBoundary>} />
                  <Route path="/diwan/library/favorites" element={<ErrorBoundary><DiwanLibraryFavoritesPage /></ErrorBoundary>} />
                  {/* Universal Knowledge Archive — order matters: /archive/new
                      must match before /archive/:id. */}
                  <Route path="/archive"       element={<ErrorBoundary><ArchiveHomePage /></ErrorBoundary>} />
                  <Route path="/archive/new"   element={<ErrorBoundary><ArchiveNewPage /></ErrorBoundary>} />
                  <Route path="/archive/:id"   element={<ErrorBoundary><ArchiveReaderPage /></ErrorBoundary>} />
                  {/* PKM — personal knowledge base (local-first MVP). */}
                  <Route path="/pkm"           element={<ErrorBoundary><PKMPage /></ErrorBoundary>} />
                  <Route path="/pkm/mind"      element={<ErrorBoundary><MindPage /></ErrorBoundary>} />
                  {/* OAuth consent for external clients (MCP / Agent integrations). */}
                  <Route path="/.lovable/oauth/consent" element={<ErrorBoundary><OAuthConsentPage /></ErrorBoundary>} />
                  <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
                </Routes>
              </Suspense>
            </PageTransition>
          )}
        </AnimatePresence>
      </NavModeContext.Provider>
    </div>
  );

  return (
    <main id="main-content" style={mainStyle}>
      <ScrollToTop />
      <CommandPalette />

      {effectiveSplitActive ? (
        <PanelGroup
          direction={splitLayout}
          onLayout={(sizes) => {
            if (sizes[1] !== undefined) setSplitSize(sizes[1]);
          }}
          className="h-full w-full"
        >
          <Panel defaultSize={100 - splitSize} minSize={20}>
            {primaryContent}
          </Panel>
          <PanelResizeHandle className={`relative flex items-center justify-center bg-neutral-950 border-neutral-800 transition-colors hover:bg-neutral-800 ${splitLayout === 'vertical' ? 'h-2 w-full cursor-row-resize border-y' : 'w-2 h-full cursor-col-resize border-x'}`}>
            <div className={`rounded-full bg-neutral-750 ${splitLayout === 'vertical' ? 'w-8 h-1' : 'w-1 h-8'}`} />
          </PanelResizeHandle>
          <Panel defaultSize={splitSize} minSize={20}>
            <div className="h-full w-full bg-neutral-950 border-neutral-800 flex flex-col relative"
                 style={{
                   borderLeftWidth: splitLayout === 'horizontal' ? '1px' : '0px',
                   borderTopWidth: splitLayout === 'vertical' ? '1px' : '0px',
                 }}>
              {/* Header for Secondary Workspace Panel */}
              <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-xs text-neutral-400 font-mono">
                <div className="flex items-center gap-2">
                  <Layout className="w-3.5 h-3.5 text-[#C9A84C]" />
                  <span className="font-semibold text-neutral-300">
                    {isAr ? 'مساحة العمل الثانوية' : 'Sekundärer Workspace'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-neutral-400 max-w-[120px] truncate">
                    {splitUrl}
                  </span>
                  <button
                    onClick={() => setSplitActive(false)}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Responsive isolated Sub-Page View using dynamic iframe */}
              <iframe
                src={`${window.location.origin}${splitUrl}?is_split_pane=true`}
                className="flex-1 w-full border-none bg-neutral-950"
                title="Secondary Workspace Pane"
              />
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        primaryContent
      )}
    </main>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <SystemEngineProvider>
        <IconProvider>
        <VoicePlayerProvider>
          <ImageUploadProvider>
          <PodcastPlayerProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AutoPrayerThemeRunner />
                <PresenceRunner />
                <NetworkConnectivityListener />
                <EdgeSwipeBack />
                <AnimatedRoutes />
                <BottomNav />
                <PodcastMiniPlayer />
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
          </PodcastPlayerProvider>
          </ImageUploadProvider>
        </VoicePlayerProvider>
        </IconProvider>
      </SystemEngineProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
