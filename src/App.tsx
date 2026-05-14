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
const GamesPage = lazy(() => import("./pages/Games"));
const SudokuPage = lazy(() => import("./pages/Sudoku"));
const ChessPage = lazy(() => import("./pages/Chess"));
const MemoryGame = lazy(() => import("./pages/MemoryGame"));
const MinesweeperPage = lazy(() => import("./pages/Minesweeper"));
const ColorMazePage = lazy(() => import("./pages/ColorMaze"));
const PipesPage = lazy(() => import("./pages/PipesGame"));
const DiceGamePage = lazy(() => import("./pages/DiceGame"));
const TargetGamePage = lazy(() => import("./pages/TargetGame"));
const PuzzleGamePage = lazy(() => import("./pages/PuzzleGame"));

const HexGamePage = lazy(() => import("./pages/HexGame"));
const FocusGamePage = lazy(() => import("./pages/FocusGame"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const ThemeSettingsPage = lazy(() => import("./pages/ThemeSettings"));
const AuthPage = lazy(() => import("./pages/Auth"));
const ProfileEditPage = lazy(() => import("./pages/ProfileEdit"));
const FontSettingsPage = lazy(() => import("./pages/FontSettings"));
const PrayerSettingsPage = lazy(() => import("./pages/PrayerSettings"));
const DuasPage = lazy(() => import("./pages/Duas"));
const DiwanPage = lazy(() => import("./pages/Diwan"));
const AllOccasionsPage = lazy(() => import("./pages/AllOccasions"));
const ReadingPage = lazy(() => import("./pages/Reading"));
const TimedSunnahPage = lazy(() => import("./pages/TimedSunnah"));
const SunnahDetailPage = lazy(() => import("./pages/SunnahDetail"));
const PropheticDayPage = lazy(() => import("./pages/PropheticDay"));
const UntimedSunnahPage = lazy(() => import("./pages/UntimedSunnah"));
const QuranVirtuesPage = lazy(() => import("./pages/QuranVirtues"));
const WellnessPage = lazy(() => import("./pages/Wellness"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
