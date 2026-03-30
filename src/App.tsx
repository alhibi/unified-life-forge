import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index";
import GamesPage from "./pages/Games";
import SudokuPage from "./pages/Sudoku";
import ChessPage from "./pages/Chess";
import MemoryGame from "./pages/MemoryGame";
import MinesweeperPage from "./pages/Minesweeper";
import ColorMazePage from "./pages/ColorMaze";
import PipesPage from "./pages/PipesGame";
import SettingsPage from "./pages/Settings";
import ThemeSettingsPage from "./pages/ThemeSettings";
import AuthPage from "./pages/Auth";
import FontSettingsPage from "./pages/FontSettings";
import PrayerSettingsPage from "./pages/PrayerSettings";
import DuasPage from "./pages/Duas";
import DiwanPage from "./pages/Diwan";
import AllOccasionsPage from "./pages/AllOccasions";
import ReadingPage from "./pages/Reading";
import TimedSunnahPage from "./pages/TimedSunnah";
import SunnahDetailPage from "./pages/SunnahDetail";
import PropheticDayPage from "./pages/PropheticDay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
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
        <Route path="/duas" element={<PageTransition><DuasPage /></PageTransition>} />
        <Route path="/diwan" element={<PageTransition><DiwanPage /></PageTransition>} />
        <Route path="/occasions" element={<PageTransition><AllOccasionsPage /></PageTransition>} />
        <Route path="/reading" element={<PageTransition><ReadingPage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="/settings/theme" element={<PageTransition><ThemeSettingsPage /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
        <Route path="/settings/font" element={<PageTransition><FontSettingsPage /></PageTransition>} />
        <Route path="/settings/prayer" element={<PageTransition><PrayerSettingsPage /></PageTransition>} />
        <Route path="/section/timed-sunnah" element={<PageTransition><TimedSunnahPage /></PageTransition>} />
        <Route path="/section/timed-sunnah/:categoryId" element={<PageTransition><SunnahDetailPage /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
