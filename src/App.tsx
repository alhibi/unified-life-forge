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

// Eager load the main page
import Index from "./pages/Index";

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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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
            <Route path="/" element={<PageTransition><Index /></PageTransition>} />
            <Route path="/games" element={<PageTransition><GamesPage /></PageTransition>} />
            <Route path="/games/sudoku" element={<PageTransition><SudokuPage /></PageTransition>} />
            <Route path="/games/chess" element={<PageTransition><ChessPage /></PageTransition>} />
            <Route path="/games/memory" element={<PageTransition><MemoryGame /></PageTransition>} />
            <Route path="/games/minesweeper" element={<PageTransition><MinesweeperPage /></PageTransition>} />
            <Route path="/games/colormaze" element={<PageTransition><ColorMazePage /></PageTransition>} />
            <Route path="/games/pipes" element={<PageTransition><PipesPage /></PageTransition>} />
            <Route path="/games/dice" element={<PageTransition><DiceGamePage /></PageTransition>} />
            <Route path="/games/target" element={<PageTransition><TargetGamePage /></PageTransition>} />
            <Route path="/games/puzzle" element={<PageTransition><PuzzleGamePage /></PageTransition>} />
            
            <Route path="/games/hex" element={<PageTransition><HexGamePage /></PageTransition>} />
            <Route path="/games/focus" element={<PageTransition><FocusGamePage /></PageTransition>} />
            <Route path="/duas" element={<PageTransition><DuasPage /></PageTransition>} />
            <Route path="/diwan" element={<PageTransition><DiwanPage /></PageTransition>} />
            <Route path="/occasions" element={<PageTransition><AllOccasionsPage /></PageTransition>} />
            <Route path="/reading" element={<PageTransition><ReadingPage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
            <Route path="/settings/theme" element={<PageTransition><ThemeSettingsPage /></PageTransition>} />
            <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
            <Route path="/settings/profile" element={<PageTransition><ProfileEditPage /></PageTransition>} />
            <Route path="/settings/font" element={<PageTransition><FontSettingsPage /></PageTransition>} />
            <Route path="/settings/prayer" element={<PageTransition><PrayerSettingsPage /></PageTransition>} />
            <Route path="/section/timed-sunnah" element={<PageTransition><TimedSunnahPage /></PageTransition>} />
            <Route path="/section/timed-sunnah/:categoryId" element={<PageTransition><SunnahDetailPage /></PageTransition>} />
            <Route path="/section/untimed-sunnah" element={<PageTransition><UntimedSunnahPage /></PageTransition>} />
            <Route path="/section/prophetic-day" element={<PageTransition><PropheticDayPage /></PageTransition>} />
            <Route path="/section/quran-virtues" element={<PageTransition><QuranVirtuesPage /></PageTransition>} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
