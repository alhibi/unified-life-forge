import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import BottomNav from "@/components/BottomNav";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/sudoku" element={<SudokuPage />} />
            <Route path="/games/chess" element={<ChessPage />} />
            <Route path="/games/memory" element={<MemoryGame />} />
            <Route path="/games/minesweeper" element={<MinesweeperPage />} />
            <Route path="/games/colormaze" element={<ColorMazePage />} />
            <Route path="/games/pipes" element={<PipesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/theme" element={<ThemeSettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
