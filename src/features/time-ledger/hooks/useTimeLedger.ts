/**
 * Time Ledger Hooks — React integration for the unified timeline.
 *
 * Uses TanStack Query for server state management with optimistic updates
 * for quick captures. Follows the app's NetworkStatus pattern.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

import { timeLedgerApi } from '../api';
import type {
  TimeLedgerEntry,
  TimeLedgerDayGroup,
  TimeLedgerQueryFilters,
  TimeLedgerSource,
  QuickCaptureEntry,
} from '../types';

// ──────────────────────────────────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────────────────────────────────

export const timeLedgerKeys = {
  all: ['time-ledger'] as const,
  timeline: (filters?: TimeLedgerQueryFilters) => [...timeLedgerKeys.all, 'timeline', filters] as const,
  byDay: (filters?: TimeLedgerQueryFilters) => [...timeLedgerKeys.all, 'by-day', filters] as const,
  layers: () => [...timeLedgerKeys.all, 'layers'] as const,
};

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type TimeLedgerNetworkStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseTimeLedgerResult {
  // Data
  entries: TimeLedgerEntry[];
  dayGroups: TimeLedgerDayGroup[];

  // Status
  status: TimeLedgerNetworkStatus;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  lastFetched: number | null;

  // Layer visibility state
  enabledLayers: TimeLedgerSource[];
  setEnabledLayers: (layers: TimeLedgerSource[]) => void;
  toggleLayer: (layer: TimeLedgerSource) => void;

  // Filters
  filters: TimeLedgerQueryFilters;
  setFilters: (filters: TimeLedgerQueryFilters) => void;
  clearFilters: () => void;

  // Actions
  refetch: () => void;
  createQuickCapture: (entry: Omit<QuickCaptureEntry, 'id' | 'source' | 'layerColor'>) => Promise<QuickCaptureEntry>;
  updateQuickCapture: (id: string, patch: Partial<Pick<QuickCaptureEntry, 'title' | 'description' | 'tags' | 'meta'>>) => Promise<void>,
  deleteQuickCapture: (id: string) => Promise<void>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Default Filters
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TimeLedgerQueryFilters = {
  sources: [
    'calendar',
    'habits',
    'fitness',
    'weather',
    'knowledge',
    'quick-capture',
    'prayer',
    'journal',
  ],
  limit: 500,
};

// ──────────────────────────────────────────────────────────────────────────────
// Main Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useTimeLedger(
  initialFilters?: Partial<TimeLedgerQueryFilters>,
  options?: Partial<UseQueryOptions<TimeLedgerEntry[], Error>>
): UseTimeLedgerResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = useState<TimeLedgerQueryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [enabledLayers, setEnabledLayersState] = useState<TimeLedgerSource[]>(DEFAULT_FILTERS.sources ?? []);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Merge filters with enabled layers
  const effectiveFilters = useMemo(() => ({
    ...filters,
    sources: filters.sources?.filter(s => enabledLayers.includes(s)) ?? enabledLayers,
  }), [filters, enabledLayers]);

  // Fetch timeline entries
  const timelineQuery = useQuery({
    queryKey: timeLedgerKeys.timeline(effectiveFilters),
    queryFn: () => timeLedgerApi.fetchTimeline(effectiveFilters),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });

  // Fetch day groups
  const dayGroupsQuery = useQuery({
    queryKey: timeLedgerKeys.byDay(effectiveFilters),
    queryFn: () => timeLedgerApi.fetchTimelineByDay(effectiveFilters),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Create quick capture mutation
  const createCaptureMutation = useMutation({
    mutationFn: (entry: Omit<QuickCaptureEntry, 'id' | 'source' | 'layerColor'>) =>
      timeLedgerApi.createQuickCapture(entry),
    onSuccess: (newEntry) => {
      // Optimistically update the timeline cache
      queryClient.setQueryData<TimeLedgerEntry[]>(
        timeLedgerKeys.timeline(effectiveFilters),
        (old) => old ? [newEntry, ...old] : [newEntry]
      );
      // Invalidate day groups to regroup
      queryClient.invalidateQueries({ queryKey: timeLedgerKeys.byDay(effectiveFilters) });
    },
  });

  // Update quick capture mutation
  const updateCaptureMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<QuickCaptureEntry, 'title' | 'description' | 'tags' | 'meta'>> }) =>
      timeLedgerApi.updateQuickCapture(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeLedgerKeys.timeline(effectiveFilters) });
      queryClient.invalidateQueries({ queryKey: timeLedgerKeys.byDay(effectiveFilters) });
    },
  });

  // Delete quick capture mutation
  const deleteCaptureMutation = useMutation({
    mutationFn: (id: string) => timeLedgerApi.deleteQuickCapture(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<TimeLedgerEntry[]>(
        timeLedgerKeys.timeline(effectiveFilters),
        (old) => old?.filter(e => e.id !== id) ?? []
      );
      queryClient.invalidateQueries({ queryKey: timeLedgerKeys.byDay(effectiveFilters) });
    },
  });

  // Wrapper functions to match the expected signature
  const createQuickCapture = useCallback(
    (entry: Omit<QuickCaptureEntry, 'id' | 'source' | 'layerColor'>) => createCaptureMutation.mutateAsync(entry),
    [createCaptureMutation]
  );

  const updateQuickCapture = useCallback(
    (id: string, patch: Partial<Pick<QuickCaptureEntry, 'title' | 'description' | 'tags' | 'meta'>>) =>
      updateCaptureMutation.mutateAsync({ id, patch }),
    [updateCaptureMutation]
  );

  const deleteQuickCapture = useCallback(
    (id: string) => deleteCaptureMutation.mutateAsync(id),
    [deleteCaptureMutation]
  );

  // Set filters with debouncing
  const setFilters = useCallback((newFilters: TimeLedgerQueryFilters) => {
    setFiltersState(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setEnabledLayersState(DEFAULT_FILTERS.sources ?? []);
  }, []);

  const setEnabledLayers = useCallback((layers: TimeLedgerSource[]) => {
    setEnabledLayersState(layers);
  }, []);

  const toggleLayer = useCallback((layer: TimeLedgerSource) => {
    setEnabledLayersState(prev => prev.includes(layer)
      ? prev.filter(l => l !== layer)
      : [...prev, layer]
    );
  }, []);

  // Track last fetch time
  if (timelineQuery.isSuccess && timelineQuery.dataUpdatedAt > (lastFetched ?? 0)) {
    setLastFetched(timelineQuery.dataUpdatedAt);
  }

  // Derived status
  const isLoading = timelineQuery.isLoading || dayGroupsQuery.isLoading;
  const isFetching = timelineQuery.isFetching || dayGroupsQuery.isFetching;
  const status: TimeLedgerNetworkStatus = useMemo(() => {
    if (isLoading) return 'loading';
    if (timelineQuery.isError || dayGroupsQuery.isError) return 'error';
    if (timelineQuery.isSuccess && dayGroupsQuery.isSuccess) return 'success';
    return 'idle';
  }, [isLoading, timelineQuery.isError, dayGroupsQuery.isError, timelineQuery.isSuccess, dayGroupsQuery.isSuccess]);

  const error = timelineQuery.error ?? dayGroupsQuery.error;

  return {
    entries: timelineQuery.data ?? [],
    dayGroups: dayGroupsQuery.data ?? [],
    status,
    isLoading,
    isFetching,
    error,
    lastFetched,
    enabledLayers,
    setEnabledLayers,
    toggleLayer,
    filters: effectiveFilters,
    setFilters,
    clearFilters,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: timeLedgerKeys.timeline(effectiveFilters) });
      queryClient.invalidateQueries({ queryKey: timeLedgerKeys.byDay(effectiveFilters) });
    },
    createQuickCapture,
    updateQuickCapture,
    deleteQuickCapture,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Layer Configuration Hook
// ──────────────────────────────────────────────────────────────────────────────

import { TIME_LEDGER_LAYERS, type TimeLedgerLayerConfig } from '../types';

export function useTimeLedgerLayers() {
  return {
    layers: TIME_LEDGER_LAYERS,
    getLayerConfig: (source: TimeLedgerSource): TimeLedgerLayerConfig | undefined =>
      TIME_LEDGER_LAYERS.find(l => l.source === source),
    getEnabledLayers: (enabledSources: TimeLedgerSource[]): TimeLedgerLayerConfig[] =>
      TIME_LEDGER_LAYERS.filter(l => enabledSources.includes(l.source)),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Quick Capture Hook (standalone, for use in FAB/modal)
// ──────────────────────────────────────────────────────────────────────────────

export interface UseQuickCaptureResult {
  createCapture: (entry: Omit<QuickCaptureEntry, 'id' | 'source' | 'layerColor'>) => Promise<QuickCaptureEntry>;
  isCreating: boolean;
  createError: Error | null;
}

export function useQuickCapture(): UseQuickCaptureResult {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: (entry: Omit<QuickCaptureEntry, 'id' | 'source' | 'layerColor'>) => {
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');
      return timeLedgerApi.createQuickCapture(entry);
    },
    onSuccess: () => {
      // Invalidate all time-ledger queries
      queryClient.invalidateQueries({ queryKey: timeLedgerKeys.all });
    },
  });

  return {
    createCapture: mutation.mutateAsync,
    isCreating: mutation.isPending,
    createError: mutation.error,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Prefetch Helpers (for predictive prefetching)
// ──────────────────────────────────────────────────────────────────────────────

export function prefetchTimeLedger(queryClient: ReturnType<typeof useQueryClient>, filters?: TimeLedgerQueryFilters) {
  return queryClient.prefetchQuery({
    queryKey: timeLedgerKeys.timeline(filters ?? DEFAULT_FILTERS),
    queryFn: () => timeLedgerApi.fetchTimeline(filters ?? DEFAULT_FILTERS),
    staleTime: 5 * 60 * 1000,
  });
}

export function prefetchTimeLedgerByDay(queryClient: ReturnType<typeof useQueryClient>, filters?: TimeLedgerQueryFilters) {
  return queryClient.prefetchQuery({
    queryKey: timeLedgerKeys.byDay(filters ?? DEFAULT_FILTERS),
    queryFn: () => timeLedgerApi.fetchTimelineByDay(filters ?? DEFAULT_FILTERS),
    staleTime: 5 * 60 * 1000,
  });
}