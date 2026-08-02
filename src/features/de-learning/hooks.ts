import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCefrLevels,
  fetchUnits,
  fetchLessons,
  fetchGrammarPoints,
  fetchVocabularyItems,
  fetchExercises,
  fetchUserStats,
  fetchUserProgress,
  updateUserProgress,
  buildLearningSession,
  submitSrsReview,
  updateXpAndStreak,
} from './api';
import { SrsRating } from './types';

export const deLearningKeys = {
  all: ['de-learning'] as const,
  levels: () => [...deLearningKeys.all, 'levels'] as const,
  units: (levelId?: string) => [...deLearningKeys.all, 'units', { levelId }] as const,
  lessons: (unitId?: string) => [...deLearningKeys.all, 'lessons', { unitId }] as const,
  grammarPoints: (lessonId: string) => [...deLearningKeys.all, 'grammarPoints', { lessonId }] as const,
  vocab: (levelId?: string) => [...deLearningKeys.all, 'vocab', { levelId }] as const,
  exercises: (lessonId?: string) => [...deLearningKeys.all, 'exercises', { lessonId }] as const,
  stats: () => [...deLearningKeys.all, 'stats'] as const,
  progress: () => [...deLearningKeys.all, 'progress'] as const,
  session: (minutes: number) => [...deLearningKeys.all, 'session', { minutes }] as const,
};

export function useCefrLevels() {
  return useQuery({
    queryKey: deLearningKeys.levels(),
    queryFn: () => fetchCefrLevels(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useUnits(levelId?: string) {
  return useQuery({
    queryKey: deLearningKeys.units(levelId),
    queryFn: () => fetchUnits(levelId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLessons(unitId?: string) {
  return useQuery({
    queryKey: deLearningKeys.lessons(unitId),
    queryFn: () => fetchLessons(unitId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGrammarPoints(lessonId: string) {
  return useQuery({
    queryKey: deLearningKeys.grammarPoints(lessonId),
    queryFn: () => fetchGrammarPoints(lessonId),
    enabled: Boolean(lessonId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVocabularyItems(levelId?: string) {
  return useQuery({
    queryKey: deLearningKeys.vocab(levelId),
    queryFn: () => fetchVocabularyItems(levelId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useExercises(lessonId?: string) {
  return useQuery({
    queryKey: deLearningKeys.exercises(lessonId),
    queryFn: () => fetchExercises(lessonId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useGermanStats() {
  return useQuery({
    queryKey: deLearningKeys.stats(),
    queryFn: () => fetchUserStats(),
  });
}

export function useGermanProgress() {
  return useQuery({
    queryKey: deLearningKeys.progress(),
    queryFn: () => fetchUserProgress(),
  });
}

export function useBuildSession(minutes = 5) {
  return useQuery({
    queryKey: deLearningKeys.session(minutes),
    queryFn: () => buildLearningSession(minutes),
    refetchOnWindowFocus: false,
    gcTime: 0, // Never cache learning session so every trigger creates a fresh list
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateLessonProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, status, score }: { lessonId: string; status: 'not_started' | 'in_progress' | 'completed'; score?: number }) =>
      updateUserProgress(lessonId, status, score),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deLearningKeys.progress() });
    },
  });
}

export function useSubmitSrsReview() {
  return useMutation({
    mutationFn: ({ itemId, itemType, rating }: { itemId: string; itemType: 'vocab' | 'grammar'; rating: SrsRating }) =>
      submitSrsReview(itemId, itemType, rating),
  });
}

export function useUpdateStats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (xpEarned: number) => updateXpAndStreak(xpEarned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deLearningKeys.stats() });
    },
  });
}
