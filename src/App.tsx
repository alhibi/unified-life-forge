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
// Tab pages are eager-loaded and stay mounted across navigation so
// switching between bottom-nav tabs feels instant (no remount/refetch).
import GamesPage from "./pages/Games";
import SettingsPage from "./pages/Settings";
import DuasPage from "./pages/Duas";
import DiwanPage from "./pages/Diwan";
import ChatPage from "./pages/Chat";
import WellnessPage from "./pages/Wellness";

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
const loadMine = () => import("./pages/Minesweeper");
const loadMaze = () => import("./pages/ColorMaze");
const loadPipes = () => import("./pages/PipesGame");
const loadDice = () => import("./pages/DiceGame");
const loadTarget = () => import("./pages/TargetGame");
const loadPuzzle = () => import("./pages/PuzzleGame");
const loadHex = () => import("./pages/HexGame");
const loadFocus = () => import("./pages/FocusGame");
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
const loadNotFound = () => import("./pages/NotFound");

const SudokuPage = lazy(loadSudoku);
const ChessPage = lazy(loadChess);
const MemoryGame = lazy(loadMemory);
const MinesweeperPage = lazy(loadMine);
const ColorMazePage = lazy(loadMaze);
const PipesPage = lazy(loadPipes);
const DiceGamePage = lazy(loadDice);
const TargetGamePage = lazy(loadTarget);
const PuzzleGamePage = lazy(loadPuzzle);
const HexGamePage = lazy(loadHex);
const FocusGamePage = lazy(loadFocus);
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
const NotFound = lazy(loadNotFound);

// Tab pages are now eager (always mounted), so the idle prefetch warms
// the next most-likely sub-routes instead of the tabs themselves.
function useIdlePrefetch() {
  useEffect(() => {
    const ric: (cb: () => void) => number =
      (window as any).requestIdleCallback ||
      ((cb) => window.setTimeout(cb, 1500));
    const id = ric(() => {
      loadTheme(); loadProfile(); loadPrayer(); loadReading();
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
const TAB_PATHS = ['/', '/games', '/chat', '/settings', '/duas', '/diwan', '/wellness'] as const;
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
      <ErrorBoundary>{node}</ErrorBoundary>
    </div>
  );
  return (
    <div style={{ display: visible ? 'block' : 'none' }}>
      {slot('/',         <Index />)}
      {slot('/games',    <GamesPage />)}
      {slot('/chat',     <ChatPage />)}
      {slot('/settings', <SettingsPage />)}
      {slot('/duas',     <DuasPage />)}
      {slot('/diwan',    <DiwanPage />)}
      {slot('/wellness', <WellnessPage />)}
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
            <Route path="/diwan" element={null} />
            <Route path="/wellness" element={null} />
            <Route path="/games/sudoku" element={<ErrorBoundary><PageTransition><SudokuPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/chess" element={<ErrorBoundary><PageTransition><ChessPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/memory" element={<ErrorBoundary><PageTransition><MemoryGame /></PageTransition></ErrorBoundary>} />
            <Route path="/games/minesweeper" element={<ErrorBoundary><PageTransition><MinesweeperPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/colormaze" element={<ErrorBoundary><PageTransition><ColorMazePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/pipes" element={<ErrorBoundary><PageTransition><PipesPage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/dice" element={<ErrorBoundary><PageTransition><DiceGamePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/target" element={<ErrorBoundary><PageTransition><TargetGamePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/puzzle" element={<ErrorBoundary><PageTransition><PuzzleGamePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/hex" element={<ErrorBoundary><PageTransition><HexGamePage /></PageTransition></ErrorBoundary>} />
            <Route path="/games/focus" element={<ErrorBoundary><PageTransition><FocusGamePage /></PageTransition></ErrorBoundary>} />
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
