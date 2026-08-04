import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AlBayanAnalysisResult } from "../types/bayan";
import { analyzeArabicText } from "../lib/bayanEngine";

interface BayanState {
  history: AlBayanAnalysisResult[];
  activeAnalysis: AlBayanAnalysisResult | null;
  bookmarkedAnalyses: Record<string, string>; // Record of id -> Custom bookmark title
  loading: boolean;
  error: string | null;

  // Actions
  analyzeText: (text: string) => Promise<AlBayanAnalysisResult | null>;
  bookmarkAnalysis: (id: string, title: string) => void;
  removeBookmark: (id: string) => void;
  clearHistory: () => void;
  deleteAnalysis: (id: string) => void;
  setActiveAnalysis: (result: AlBayanAnalysisResult | null) => void;
}

export const useBayanStore = create<BayanState>()(
  persist(
    (set, get) => ({
      history: [],
      activeAnalysis: null,
      bookmarkedAnalyses: {},
      loading: false,
      error: null,

      analyzeText: async (text: string) => {
        set({ loading: true, error: null });
        try {
          // Off-thread emulation to preserve 120 FPS interface
          const result = await new Promise<AlBayanAnalysisResult>((resolve) => {
            setTimeout(() => {
              const res = analyzeArabicText(text);
              resolve(res);
            }, 300); // Tiny processing latency to showcase tactile luxury loaders
          });

          set((state) => {
            // Keep history length capped to prevent memory and storage bloat
            const updatedHistory = [result, ...state.history].slice(0, 30);
            return {
              history: updatedHistory,
              activeAnalysis: result,
              loading: false,
            };
          });

          return result;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تحليل النص";
          set({ error: errMsg, loading: false });
          return null;
        }
      },

      bookmarkAnalysis: (id, title) => {
        set((state) => ({
          bookmarkedAnalyses: {
            ...state.bookmarkedAnalyses,
            [id]: title || "تحليل بلاغي محفوظ",
          },
        }));
      },

      removeBookmark: (id) => {
        set((state) => {
          const updated = { ...state.bookmarkedAnalyses };
          delete updated[id];
          return { bookmarkedAnalyses: updated };
        });
      },

      clearHistory: () => {
        set({ history: [], activeAnalysis: null });
      },

      deleteAnalysis: (id) => {
        set((state) => {
          const updatedHistory = state.history.filter((h) => h.id !== id);
          const activeAnalysis = state.activeAnalysis?.id === id ? null : state.activeAnalysis;
          const bookmarked = { ...state.bookmarkedAnalyses };
          delete bookmarked[id];
          return {
            history: updatedHistory,
            activeAnalysis,
            bookmarkedAnalyses: bookmarked,
          };
        });
      },

      setActiveAnalysis: (result) => {
        set({ activeAnalysis: result });
      },
    }),
    {
      name: "smarthub-diwan-bayan-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist specific variables to avoid bloating local storage limits
      partialize: (state) => ({
        history: state.history,
        bookmarkedAnalyses: state.bookmarkedAnalyses,
      }),
    }
  )
);
