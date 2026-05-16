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
import FloatingVoicePlayer from "@/components/FloatingVoicePlayer";
import { lazy, Suspense } from "react";
import { useEffect } from "react";
import { useAutoPrayerTheme } from "@/hooks/useAutoPrayerTheme";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";

// Eager load the main page
import Index from "./pages/Index";

function AutoPrayerThemeRunner() {
  useAutoPrayerTheme();
  return null;
}

function PresenceRunner() {
  const { user } = useAuth();
  usePresence(user?.id);
  return null;
}

// Lazy load all other pages
// Lazy loaders are kept as named factories so we can prefetch them on idle.
const loadGames = () => import("./pages/Games");
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
const loadSettings = () => import("./pages/Settings");
const loadTheme = () => import("./pages/ThemeSettings");
const loadAuth = () => import("./pages/Auth");
const loadProfile = () => import("./pages/ProfileEdit");
const loadFont = () => import("./pages/FontSettings");
const loadPrayer = () => import("./pages/PrayerSettings");
const loadDuas = () => import("./pages/Duas");
const loadDiwan = () => import("./pages/Diwan");
const loadOccasions = () => import("./pages/AllOccasions");
const loadReading = () => import("./pages/Reading");
const loadTimed = () => import("./pages/TimedSunnah");
const loadSunnahDetail = () => import("./pages/SunnahDetail");
const loadProphetic = () => import("./pages/PropheticDay");
const loadUntimed = () => import("./pages/UntimedSunnah");
const loadVirtues = () => import("./pages/QuranVirtues");
const loadWellness = () => import("./pages/Wellness");
const loadChat = () => import("./pages/Chat");
const loadNotFound = () => import("./pages/NotFound");

const GamesPage = lazy(loadGames);
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
const SettingsPage = lazy(loadSettings);
const ThemeSettingsPage = lazy(loadTheme);
const AuthPage = lazy(loadAuth);
const ProfileEditPage = lazy(loadProfile);
const FontSettingsPage = lazy(loadFont);
const PrayerSettingsPage = lazy(loadPrayer);
const DuasPage = lazy(loadDuas);
const DiwanPage = lazy(loadDiwan);
const AllOccasionsPage = lazy(loadOccasions);
const ReadingPage = lazy(loadReading);
const TimedSunnahPage = lazy(loadTimed);
const SunnahDetailPage = lazy(loadSunnahDetail);
const PropheticDayPage = lazy(loadProphetic);
const UntimedSunnahPage = lazy(loadUntimed);
const QuranVirtuesPage = lazy(loadVirtues);
const WellnessPage = lazy(loadWellness);
const ChatPage = lazy(loadChat);
const NotFound = lazy(loadNotFound);

// Warm the most-used tab chunks once the browser is idle, so the first
// navigation feels instant without bloating the initial bundle.
function useIdlePrefetch() {
  useEffect(() => {
    const ric: (cb: () => void) => number =
      (window as any).requestIdleCallback ||
      ((cb) => window.setTimeout(cb, 1500));
    const id = ric(() => {
      loadSettings(); loadGames(); loadDuas(); loadDiwan(); loadChat();
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

function AnimatedRoutes() {
  const location = useLocation();
  useIdlePrefetch();
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageSkeleton />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<ErrorBoundary><PageTransition><Index /></PageTransition></ErrorBoundary>} />
            <Route path="/games" element={<ErrorBoundary><PageTransition><GamesPage /></PageTransition></ErrorBoundary>} />
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
            <Route path="/duas" element={<ErrorBoundary><PageTransition><DuasPage /></PageTransition></ErrorBoundary>} />
            <Route path="/diwan" element={<ErrorBoundary><PageTransition><DiwanPage /></PageTransition></ErrorBoundary>} />
            <Route path="/occasions" element={<ErrorBoundary><PageTransition><AllOccasionsPage /></PageTransition></ErrorBoundary>} />
            <Route path="/reading" element={<ErrorBoundary><PageTransition><ReadingPage /></PageTransition></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary><PageTransition><SettingsPage /></PageTransition></ErrorBoundary>} />
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
            <Route path="/wellness" element={<ErrorBoundary><PageTransition><WellnessPage /></PageTransition></ErrorBoundary>} />
            <Route path="/chat" element={<ErrorBoundary><PageTransition><ChatPage /></PageTransition></ErrorBoundary>} />
            <Route path="*" element={<ErrorBoundary><PageTransition><NotFound /></PageTransition></ErrorBoundary>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
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
              <FloatingVoicePlayer />
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
