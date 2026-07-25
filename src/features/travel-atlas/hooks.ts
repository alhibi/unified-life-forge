import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  createPlace,
  fetchCountryPlaces,
  fetchTravelCountries,
  fetchTravelCountry,
  type CreatePlaceInput,
} from './api';
import {
  cacheCountries,
  cachePlaces,
  getCachedCountries,
  getCachedCountry,
  getCachedPlaces,
  invalidateCountriesCache,
  invalidatePlacesCache,
  isCountriesCacheStale,
  isPlacesCacheStale,
} from './offlineCache';
import type { TravelCountry, TravelPlace } from './types';

export const travelAtlasKeys = {
  all: ['travel-atlas'] as const,
  countries: () => [...travelAtlasKeys.all, 'countries'] as const,
  country: (countryId: string) => [...travelAtlasKeys.countries(), countryId] as const,
  places: (countryId: string) => [...travelAtlasKeys.all, 'places', countryId] as const,
};

// ── Countries with offline-first (stale-while-revalidate) ───────────────────

export function useTravelCountries() {
  const qc = useQueryClient();
  const revalidatedRef = useRef(false);

  const query = useQuery({
    queryKey: travelAtlasKeys.countries(),
    queryFn: async (): Promise<TravelCountry[]> => {
      // Try cache first
      const cached = await getCachedCountries();
      const isStale = await isCountriesCacheStale();

      if (cached && cached.length > 0) {
        // If we have cached data, return it immediately
        // Schedule background revalidation if stale
        if (isStale && !revalidatedRef.current) {
          revalidatedRef.current = true;
          revalidateCountries(qc);
        }
        return cached;
      }

      // No cache: fetch from network
      const fresh = await fetchTravelCountries();
      await cacheCountries(fresh);
      return fresh;
    },
  });

  return query;
}

async function revalidateCountries(qc: ReturnType<typeof useQueryClient>) {
  try {
    const fresh = await fetchTravelCountries();
    await cacheCountries(fresh);
    qc.setQueryData(travelAtlasKeys.countries(), fresh);
  } catch (error) {
    // Background revalidation failed — keep serving stale data
    console.warn('[TravelAtlas] Background countries revalidation failed:', error);
  }
}

// ── Single Country with cache fallback ──────────────────────────────────────

export function useTravelCountry(countryId: string | undefined) {
  return useQuery({
    queryKey: travelAtlasKeys.country(countryId ?? ''),
    queryFn: async (): Promise<TravelCountry> => {
      if (!countryId) throw new Error('No country ID');

      try {
        const country = await fetchTravelCountry(countryId);
        return country;
      } catch (error) {
        // Fallback to cache on network error
        const cached = await getCachedCountry(countryId);
        if (cached) return cached;
        throw error;
      }
    },
    enabled: Boolean(countryId),
  });
}

// ── Places with offline-first (stale-while-revalidate) ──────────────────────

export function useCountryPlaces(countryId: string | undefined) {
  const qc = useQueryClient();
  const revalidatedRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: travelAtlasKeys.places(countryId ?? ''),
    queryFn: async (): Promise<TravelPlace[]> => {
      if (!countryId) return [];

      // Try cache first
      const cached = await getCachedPlaces(countryId);
      const isStale = await isPlacesCacheStale(countryId);

      if (cached && cached.length > 0) {
        // Return cached data immediately
        // Schedule background revalidation if stale
        if (isStale && revalidatedRef.current !== countryId) {
          revalidatedRef.current = countryId;
          revalidatePlaces(countryId, qc);
        }
        return cached;
      }

      // No cache: fetch from network
      const fresh = await fetchCountryPlaces(countryId);
      await cachePlaces(countryId, fresh);
      return fresh;
    },
    enabled: Boolean(countryId),
  });

  return query;
}

async function revalidatePlaces(countryId: string, qc: ReturnType<typeof useQueryClient>) {
  try {
    const fresh = await fetchCountryPlaces(countryId);
    await cachePlaces(countryId, fresh);
    qc.setQueryData(travelAtlasKeys.places(countryId), fresh);
  } catch (error) {
    // Background revalidation failed — keep serving stale data
    console.warn('[TravelAtlas] Background places revalidation failed:', error);
  }
}

// ── Create Place Mutation ───────────────────────────────────────────────────

export function useCreatePlace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlaceInput) => createPlace(input),
    onSuccess: async (place) => {
      // Invalidate both cache layers
      await invalidateCountriesCache();
      await invalidatePlacesCache(place.countryId);

      // Refresh queries
      qc.invalidateQueries({ queryKey: travelAtlasKeys.countries() });
      qc.invalidateQueries({ queryKey: travelAtlasKeys.places(place.countryId) });
      qc.invalidateQueries({ queryKey: travelAtlasKeys.country(place.countryId) });
    },
  });
}
