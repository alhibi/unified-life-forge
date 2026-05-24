import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { VoicePlayerProvider } from "@/contexts/VoicePlayerContext";
import { ImageUploadProvider } from "@/contexts/ImageUploadContext";
import { AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import { useAutoPrayerTheme } from "@/hooks/useAutoPrayerTheme";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";
import { navStart } from "@/lib/navPerf";

// Eager load the main page
import Index from "./pages/Index";
// Tab pages that stay mounted across navigation are eager-imported so
// switching between bottom-nav tabs feels instant (no remount/refetch).
// `/wellness` and `/diwan` are deliberately NOT in this set: their data
// modules (`wellnessData.ts`, `exerciseCatalog.ts`, `foodAtlas.ts`,
// `calisthenicsAtlas.ts`, `poetryData.ts`) total ~10 000 lines and their
// import cost dominated cold-paint of the homepage even when the user
// never opened those tabs. They are routed lazily below.
import GamesPage from "./pages/Games";
import SettingsPage from "./pages/Settings";
import DuasPage from "./pages/Duas";
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
const loadNotFound = () => import("./pages/NotFound");
// Wellness and Diwan tabs are lazy because their static data files
// (~10k lines combined) make eager-loading them measurable on cold
// homepage paint. The bottom nav still highlights them and the tap
// switches the route normally — first visit pays a brief skeleton,
// subsequent visits hit React.lazy's module cache and are instant.
const loadWellness = () => import("./pages/Wellness");
const loadDiwan = () => import("./pages/Diwan");
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
const NotFound = lazy(loadNotFound);
const WellnessPage = lazy(loadWellness);
const DiwanPage = lazy(loadDiwan);
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
// Wellness and Diwan are intentionally NOT here — see the comment on
// `loadWellness` / `loadDiwan` above. They appear as regular lazy routes
// in <Routes> below and the bottom-nav still works the same way.
const TAB_PATHS = ['/', '/games', '/chat', '/settings', '/duas'] as const;
type TabPath = typeof TAB_PATHS[number];

function PersistentTabs({ active }: { active: TabPath | null }) {
  // Hide the entire layer when the user is on a non-tab route so it
  // doesn't fight for the viewport with the active sub-page.
  const visible = active !== null;
  const slot = (path: TabPath, node: React.ReactNode) => (
    <div
      key={path}
      style={{ display: active === path ? 'block' : 'none' }}
      aria-hidden={active !== path}
    >
      <ErrorBoundary>
        {active === path ? (
          <div
            key={`tab-anim-${path}-${active}`}
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
    <div style={{ display: visible ? 'block' : 'none' }}>
      {slot('/',         <Index />)}
      {slot('/games',    <GamesPage />)}
      {slot('/chat',     <ChatPage />)}
      {slot('/settings', <SettingsPage />)}
      {slot('/duas',     <DuasPage />)}
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  useIdlePrefetch();
  // Mark the navigation start timestamp synchronously on every route change.
  // PageTransition then closes the measurement after mount + paint.
  navStart(location.pathname);
  const activeTab = (TAB_PATHS as readonly string[]).includes(location.pathname)
    ? (location.pathname as TabPath)
    : null;
  return (
    <main id="main-content">
      <ScrollToTop />
      {/* Persistent layer — all 6 tab pages mounted once, toggled by display */}
      <PersistentTabs active={activeTab} />
      {/* Non-tab routes (sub-pages, settings details, games, etc.) */}
      <Suspense fallback={activeTab ? null : <PageSkeleton />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={activeTab ?? location.pathname}>
            {/* Tab paths render null — the persistent layer handles them. */}
            <Route path="/" element={null} />
            <Route path="/games" element={null} />
            <Route path="/chat" element={null} />
            <Route path="/settings" element={null} />
            <Route path="/duas" element={null} />
            {/* Wellness and Diwan tabs are lazy routes (see notes near
                `loadWellness`/`loadDiwan` above). They still appear in
                the bottom nav. */}
            <Route path="/wellness" element={<ErrorBoundary><PageTransition><WellnessPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan" element={<ErrorBoundary><PageTransition><DiwanPage /></PageTransition></ErrorBoundary>} />
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
      </Suspense>
    </main>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <VoicePlayerProvider>
        <ImageUploadProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AutoPrayerThemeRunner />
              <PresenceRunner />
              <AnimatedRoutes />
              <BottomNav />
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
        </ImageUploadProvider>
      </VoicePlayerProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
