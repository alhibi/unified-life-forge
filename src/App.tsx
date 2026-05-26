import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { VoicePlayerProvider } from "@/contexts/VoicePlayerContext";
import { ImageUploadProvider } from "@/contexts/ImageUploadContext";
import { PodcastPlayerProvider } from "@/contexts/PodcastPlayerContext";
import PodcastMiniPlayer from "@/components/podcasts/PodcastMiniPlayer";
import { AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import PageTransition, { NavModeContext } from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAutoPrayerTheme } from "@/hooks/useAutoPrayerTheme";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";
import { useNavDirection } from "@/hooks/useNavDirection";
import { navStart } from "@/lib/navPerf";

// Eager load the main page
import Index from "./pages/Index";
// Tab pages that stay mounted across navigation are eager-imported so
// switching between bottom-nav tabs feels instant (no remount/refetch).
// The new IA reorganisation kept only three persistent tabs (Home,
// Games, Chat). Heavier hubs (Wellness, Mihrab, Browse) and the
// `/diwan` redirect are routed lazily below — see the comments on
// `loadWellness` / `loadMihrab` / `loadBrowse`.
import GamesPage from "./pages/Games";
import ChatPage from "./pages/Chat";

function AutoPrayerThemeRunner() {
  useAutoPrayerTheme();
  return null;
}

function PresenceRunner() {
  const { user } = useAuth();
  usePresence(user?.id);
  return null;
}

// Lazy load all non-tab pages
// Lazy loaders are kept as named factories so we can prefetch them on idle.
const loadSudoku = () => import("./pages/Sudoku");
const loadChess = () => import("./pages/Chess");
const loadMemory = () => import("./pages/MemoryGame");
const loadDice = () => import("./pages/DiceGame");
const loadFocus = () => import("./pages/FocusGame");
const loadChessPuzzle = () => import("./pages/ChessPuzzle");
const loadChessCareer = () => import("./pages/ChessCareer");
const loadMemoryAdventure = () => import("./pages/MemoryAdventure");
const loadDiceTournament = () => import("./pages/DiceTournament");
const loadFocusDecathlon = () => import("./pages/FocusDecathlon");
const loadSettings = () => import("./pages/Settings");
const loadDuas = () => import("./pages/Duas");
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
const loadPrayer = () => import("./pages/PrayerSettings");
const loadOccasions = () => import("./pages/AllOccasions");
const loadReading = () => import("./pages/Reading");
const loadTimed = () => import("./pages/TimedSunnah");
const loadSunnahDetail = () => import("./pages/SunnahDetail");
const loadProphetic = () => import("./pages/PropheticDay");
const loadUntimed = () => import("./pages/UntimedSunnah");
const loadVirtues = () => import("./pages/QuranVirtues");
const loadTafsir = () => import("./pages/Tafsir");
const loadPodcasts = () => import("./pages/Podcasts");
const loadPodcastDetail = () => import("./pages/PodcastDetail");
const loadPodcastLibrary = () => import("./pages/PodcastLibrary");
const loadNotFound = () => import("./pages/NotFound");
// Wellness and Diwan tabs are lazy because their static data files
// (~10k lines combined) make eager-loading them measurable on cold
// homepage paint. The bottom nav still highlights them and the tap
// switches the route normally — first visit pays a brief skeleton,
// subsequent visits hit React.lazy's module cache and are instant.
const loadWellness = () => import("./pages/Wellness");
const loadDiwan = () => import("./pages/Diwan");
// Hubs introduced by the IA reorganisation: `/browse` ("اطلاع")
// groups Podcasts + Articles, `/mihrab` groups Quran/Dhikr/Sunnah/
// Literature. Both are lightweight landings on top of the existing
// deep pages, so they're lazy-loaded — they should not pay any
// cost on cold home paint.
const loadBrowse = () => import("./pages/Browse");
const loadMihrab = () => import("./pages/Mihrab");
// Diwan library — adab.com integration
const loadLibrary = () => import("./pages/diwan/Library");
const loadLibraryPoets = () => import("./pages/diwan/LibraryPoets");
const loadLibraryPoet = () => import("./pages/diwan/LibraryPoet");
const loadLibraryPoem = () => import("./pages/diwan/LibraryPoem");
const loadLibrarySearch = () => import("./pages/diwan/LibrarySearch");
const loadLibraryFavorites = () => import("./pages/diwan/LibraryFavorites");

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
const NotFound = lazy(loadNotFound);
const WellnessPage = lazy(loadWellness);
const DiwanPage = lazy(loadDiwan);
const BrowsePage = lazy(loadBrowse);
const MihrabPage = lazy(loadMihrab);
const DiwanLibraryPage = lazy(loadLibrary);
const DiwanLibraryPoetsPage = lazy(loadLibraryPoets);
const DiwanLibraryPoetPage = lazy(loadLibraryPoet);
const DiwanLibraryPoemPage = lazy(loadLibraryPoem);
const DiwanLibrarySearchPage = lazy(loadLibrarySearch);
const DiwanLibraryFavoritesPage = lazy(loadLibraryFavorites);

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

function PersistentTabs({ active }: { active: TabPath | null }) {
  // ────────────────────────────────────────────────────────────────
  // Smooth tab → sub-page transition.
  //
  // The previous implementation toggled the entire persistent layer
  // with a hard `display: block/none`. That made tab→sub-page pushes
  // look broken: at t=0 the tab content snapped off, but the
  // incoming sub-page is keyframed from `x: 100%, opacity: 0` (off
  // the right edge), so the left half of the screen showed an empty
  // background for ~150 ms until the sub-page reached `x: 0`.
  //
  // Fix: keep the previously-active tab rendered (and visible) for
  // the duration of the page-slide, fading it out via opacity. While
  // it fades, we also flip it to `position: absolute` so it doesn't
  // push the entering sub-page out of <main>'s flow. After the fade
  // window we collapse to `display: none` so the layer takes no
  // layout space when the user is deep on a sub-page.
  //
  // The three tab components (Home / Games / Chat) are still
  // mounted at all times — only the wrapper toggles. That keeps the
  // "instant tab switch" guarantee from the original design.
  // ────────────────────────────────────────────────────────────────
  const [showing, setShowing] = useState<TabPath | null>(active);
  const fadingOut = active === null && showing !== null;
  // Final resting state — no tab to show and the fade-out window
  // has elapsed. We collapse to `display: none` here so the layer
  // doesn't reserve any layout space behind the active sub-page.
  const layerHidden = active === null && showing === null;

  useEffect(() => {
    if (active !== null) {
      // Switching to / between tabs — show immediately. Tabs that
      // toggle within the layer animate via their own slot's
      // `tab-zoom-in` keyframe.
      setShowing(active);
      return;
    }
    // We just left the persistent layer for a sub-page. Hold the
    // last visible tab on screen for the duration of the sub-page
    // slide-in so the user never sees a flash of empty background.
    // 280 ms is slightly longer than MOTION.push (300 ms is plenty)
    // and matches the opacity transition below.
    const t = window.setTimeout(() => setShowing(null), 280);
    return () => window.clearTimeout(t);
  }, [active]);

  const slot = (path: TabPath, node: React.ReactNode) => (
    <div
      key={path}
      style={{ display: showing === path ? 'block' : 'none' }}
      aria-hidden={showing !== path}
    >
      <ErrorBoundary>
        {showing === path && !fadingOut ? (
          <div
            key={`tab-anim-${path}-${showing}`}
            className="tab-zoom-in"
            style={{ transformOrigin: 'center center', willChange: 'opacity, transform' }}
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
    <div
      style={{
        // Collapse out of layout when we have nothing to show.
        display: layerHidden ? 'none' : 'block',
        // While fading out we take ourselves out of <main>'s flow so
        // the entering sub-page can occupy the viewport unhindered.
        // While in steady state we sit in normal flow so our content
        // drives <main>'s height.
        position: fadingOut ? 'absolute' : 'static',
        top: 0,
        left: 0,
        right: 0,
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fadingOut ? 'none' : 'auto',
        // The AnimatePresence wrapper below us in JSX paints on top
        // by default; this is just an explicit hint for clarity.
        zIndex: 0,
      }}
    >
      {slot('/',      <Index />)}
      {slot('/games', <GamesPage />)}
      {slot('/chat',  <ChatPage />)}
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  useIdlePrefetch();
  // Mark the navigation start timestamp synchronously on every route change.
  // PageTransition then closes the measurement after mount + paint.
  navStart(location.pathname);
  // Classify the navigation as push / pop / tab / replace / initial so
  // PageTransition can pick the right slide direction (and so OUTGOING
  // pages know whether to leave to the left or right with parallax).
  const { mode } = useNavDirection();
  const activeTab = (TAB_PATHS as readonly string[]).includes(location.pathname)
    ? (location.pathname as TabPath)
    : null;
  return (
    <main
      id="main-content"
      style={{
        paddingBottom: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        // popLayout takes the exiting page out of normal flow; the
        // entering and exiting pages must share the same coordinate
        // system, so the wrapper is positioned and stacks them.
        position: 'relative',
      }}
    >
      <ScrollToTop />
      {/* Persistent layer — three small hot tabs (Home, Games, Chat)
          mounted once and toggled by display. The other bottom-nav
          destinations (Wellness, Browse, Mihrab) are heavier and ride
          the lazy non-persistent route path below. */}
      <PersistentTabs active={activeTab} />
      {/* Non-tab routes (sub-pages, settings details, games, etc.) */}
      <Suspense fallback={activeTab ? null : <PageSkeleton />}>
        {/* NavModeContext flows the current direction down to every
            <PageTransition>; AnimatePresence forwards the same value as
            `custom` to exiting children. mode='popLayout' lets the
            outgoing page leave the layout flow so push/pop slides
            run simultaneously instead of sequentially. */}
        <NavModeContext.Provider value={mode}>
          <AnimatePresence mode="popLayout" initial={false} custom={mode}>
            <Routes location={location} key={activeTab ?? location.pathname}>
            {/* Tab paths render null — the persistent layer handles them. */}
            <Route path="/" element={null} />
            <Route path="/games" element={null} />
            <Route path="/chat" element={null} />
            {/* New chat surfaces (groups/channels + dedicated settings).
                These layer on top of /chat without touching the legacy
                drawer; the user reaches them via the "Groups & Channels"
                row inside the conversation list, the in-chat header
                "settings" affordance, or by deep-link.

                NOTE: order matters. /chat/groups must be matched
                BEFORE /chat/g/:chatId so a literal "groups" segment
                isn't captured as a chat id. */}
            <Route path="/chat/groups"   element={<ErrorBoundary><PageTransition><GroupsIndexPage /></PageTransition></ErrorBoundary>} />
            <Route path="/chat/settings" element={<ErrorBoundary><PageTransition><ChatSettingsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/chat/g/:chatId" element={<ErrorBoundary><PageTransition><GroupChatPage /></PageTransition></ErrorBoundary>} />
            {/* /settings is no longer a top-level tab. It is reached
                from the avatar shortcut on the home page and rendered
                as a regular lazy route. */}
            <Route path="/settings" element={<ErrorBoundary><PageTransition><SettingsPage /></PageTransition></ErrorBoundary>} />
            {/* /duas is now a redirect to /mihrab → Dhikr (kept for
                backward-compat with old links). */}
            <Route path="/duas" element={<ErrorBoundary><DuasPage /></ErrorBoundary>} />
            {/* Wellness and Diwan tabs are lazy routes (see notes near
                `loadWellness`/`loadDiwan` above). Wellness is a
                bottom-nav tab; /diwan is now a redirect to /mihrab →
                Literature. */}
            <Route path="/wellness" element={<ErrorBoundary><PageTransition><WellnessPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan" element={<ErrorBoundary><DiwanPage /></ErrorBoundary>} />
            {/* New IA hubs (Phase 1+2 of the reorganisation). They
                gate every other entry that the bottom nav previously
                exposed individually, so they live with the other
                lazy tab-class routes. */}
            <Route path="/browse" element={<ErrorBoundary><PageTransition><BrowsePage /></PageTransition></ErrorBoundary>} />
            <Route path="/mihrab" element={<ErrorBoundary><PageTransition><MihrabPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/sudoku" element={<ErrorBoundary><PageTransition><SudokuPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/chess" element={<ErrorBoundary><PageTransition><ChessPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/chess/puzzles" element={<ErrorBoundary><PageTransition><ChessPuzzlePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/chess/career" element={<ErrorBoundary><PageTransition><ChessCareerPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/memory" element={<ErrorBoundary><PageTransition><MemoryGame /></PageTransition></ErrorBoundary>} />
            <Route path="/games/memory/adventure" element={<ErrorBoundary><PageTransition><MemoryAdventurePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/dice" element={<ErrorBoundary><PageTransition><DiceGamePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/dice/tournament" element={<ErrorBoundary><PageTransition><DiceTournamentPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/focus" element={<ErrorBoundary><PageTransition><FocusGamePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/focus/decathlon" element={<ErrorBoundary><PageTransition><FocusDecathlonPage /></PageTransition></ErrorBoundary>} />
            <Route path="/occasions" element={<ErrorBoundary><PageTransition><AllOccasionsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/reading" element={<ErrorBoundary><PageTransition><ReadingPage /></PageTransition></ErrorBoundary>} />
            <Route path="/settings/theme" element={<ErrorBoundary><PageTransition><ThemeSettingsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/auth" element={<ErrorBoundary><PageTransition><AuthPage /></PageTransition></ErrorBoundary>} />
            <Route path="/settings/profile" element={<ErrorBoundary><PageTransition><ProfileEditPage /></PageTransition></ErrorBoundary>} />
            <Route path="/settings/font" element={<ErrorBoundary><PageTransition><FontSettingsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/settings/prayer" element={<ErrorBoundary><PageTransition><PrayerSettingsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/section/timed-sunnah" element={<ErrorBoundary><PageTransition><TimedSunnahPage /></PageTransition></ErrorBoundary>} />
            <Route path="/section/timed-sunnah/:categoryId" element={<ErrorBoundary><PageTransition><SunnahDetailPage /></PageTransition></ErrorBoundary>} />
            <Route path="/section/untimed-sunnah" element={<ErrorBoundary><PageTransition><UntimedSunnahPage /></PageTransition></ErrorBoundary>} />
            <Route path="/section/prophetic-day" element={<ErrorBoundary><PageTransition><PropheticDayPage /></PageTransition></ErrorBoundary>} />
            <Route path="/section/quran-virtues" element={<ErrorBoundary><PageTransition><QuranVirtuesPage /></PageTransition></ErrorBoundary>} />
            <Route path="/tafsir" element={<ErrorBoundary><PageTransition><TafsirPage /></PageTransition></ErrorBoundary>} />
            <Route path="/podcasts" element={<ErrorBoundary><PageTransition><PodcastsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/podcasts/library" element={<ErrorBoundary><PageTransition><PodcastLibraryPage /></PageTransition></ErrorBoundary>} />
            <Route path="/podcasts/:id" element={<ErrorBoundary><PageTransition><PodcastDetailPage /></PageTransition></ErrorBoundary>} />
            {/* Diwan Library — adab.com */}
            <Route path="/diwan/library"               element={<ErrorBoundary><PageTransition><DiwanLibraryPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan/library/search"        element={<ErrorBoundary><PageTransition><DiwanLibrarySearchPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan/library/poets"         element={<ErrorBoundary><PageTransition><DiwanLibraryPoetsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan/library/poet/:slug"    element={<ErrorBoundary><PageTransition><DiwanLibraryPoetPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan/library/poem/:slug"    element={<ErrorBoundary><PageTransition><DiwanLibraryPoemPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan/library/favorites"     element={<ErrorBoundary><PageTransition><DiwanLibraryFavoritesPage /></PageTransition></ErrorBoundary>} />
            <Route path="*" element={<ErrorBoundary><PageTransition><NotFound /></PageTransition></ErrorBoundary>} />
          </Routes>
        </AnimatePresence>
        </NavModeContext.Provider>
      </Suspense>
    </main>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
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
              <AnimatedRoutes />
              <BottomNav />
              <PodcastMiniPlayer />
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
        </PodcastPlayerProvider>
        </ImageUploadProvider>
      </VoicePlayerProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
