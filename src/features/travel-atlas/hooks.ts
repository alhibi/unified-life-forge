import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  addTripStop,
  createPlace,
  type CreatePlaceInput,
  createTrip,
  deletePlace,
  deleteTrip,
  fetchMyPlaces,
  fetchNearbyPlaces,
  fetchPlaceById,
  fetchTravelCountries,
  fetchTrips,
  removeTripStop,
  saveTripStopOrder,
  setCoverPhoto,
  setPlaceFavorite,
  setPlaceRating,
  setPlaceVisitStatus,
  type TripFields,
  updatePlace,
  type UpdatePlaceInput,
  updateTrip,
  updateTripStopNote,
} from './api';
import { buildCountrySummaries, computePassport } from './lib/stats';
import {
  cacheCountries,
  cachePlaces,
  cacheTrips,
  getCachedCountries,
  getCachedPlaces,
  getCachedTrips,
  invalidateCache,
  isCacheStale,
} from './offlineCache';
import { travelAtlasKeys } from './queryKeys';
import type { TravelCountry, TravelPlace, TripWithStops, VisitStatus } from './types';

/**
 * Offline-first read.
 *
 * A warm cache answers immediately. A stale cache still tries the network first
 * — but falls back to the stale copy rather than failing, which is the whole
 * point of an atlas you carry abroad.
 */
async function offlineFirst<T>(
  key: 'countries' | 'places' | 'trips',
  fetcher: () => Promise<T>,
  readCache: () => Promise<T | null>,
  writeCache: (value: T) => Promise<void>,
): Promise<T> {
  const [cached, stale] = await Promise.all([readCache(), isCacheStale(key)]);
  if (cached && !stale) return cached;

  try {
    const fresh = await fetcher();
    await writeCache(fresh);
    return fresh;
  } catch (error) {
    if (cached) {
      console.warn(`[TravelAtlas] serving cached ${key} after a failed refresh`, error);
      return cached;
    }
    throw error;
  }
}

// ── Reads ───────────────────────────────────────────────────────────────────

export function useTravelCountries() {
  return useQuery({
    queryKey: travelAtlasKeys.countries(),
    queryFn: () =>
      offlineFirst('countries', fetchTravelCountries, getCachedCountries, cacheCountries),
  });
}

/** The user's whole atlas. Every other place view is derived from this. */
export function useMyPlaces() {
  return useQuery({
    queryKey: travelAtlasKeys.places(),
    queryFn: () => offlineFirst('places', fetchMyPlaces, getCachedPlaces, cachePlaces),
  });
}

const EMPTY_COUNTRIES: TravelCountry[] = [];
const EMPTY_PLACES: TravelPlace[] = [];

export interface AtlasData {
  countries: TravelCountry[];
  places: TravelPlace[];
  summaries: ReturnType<typeof buildCountrySummaries>;
  passport: ReturnType<typeof computePassport>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/** Countries + places + everything derived from them, in one hook. */
export function useAtlas(): AtlasData {
  const countriesQuery = useTravelCountries();
  const placesQuery = useMyPlaces();

  // Memoised rather than `?? []` inline: a fresh empty array on every render
  // would invalidate every derived memo below it.
  const countries = useMemo(() => countriesQuery.data ?? EMPTY_COUNTRIES, [countriesQuery.data]);
  const places = useMemo(() => placesQuery.data ?? EMPTY_PLACES, [placesQuery.data]);

  const summaries = useMemo(() => buildCountrySummaries(countries, places), [countries, places]);
  const passport = useMemo(() => computePassport(places, summaries), [places, summaries]);

  return {
    countries,
    places,
    summaries,
    passport,
    isLoading: countriesQuery.isLoading || placesQuery.isLoading,
    isError: countriesQuery.isError || placesQuery.isError,
    error: countriesQuery.error ?? placesQuery.error,
  };
}

export function useTravelCountry(countryId: string | undefined) {
  const { data: countries = [] } = useTravelCountries();
  return useMemo(
    () => (countryId ? (countries.find((country) => country.id === countryId) ?? null) : null),
    [countries, countryId],
  );
}

/** Places in one country, sliced from the single atlas query. */
export function useCountryPlaces(countryId: string | undefined) {
  const query = useMyPlaces();
  const places = useMemo(
    () => (countryId ? (query.data ?? []).filter((place) => place.countryId === countryId) : []),
    [countryId, query.data],
  );
  return { ...query, places };
}

/**
 * One place. Resolved from the atlas when the viewer owns it, otherwise fetched
 * directly so a shared link still opens.
 */
export function usePlace(placeId: string | undefined) {
  const { data: places = [], isLoading: atlasLoading } = useMyPlaces();
  const owned = useMemo(
    () => (placeId ? (places.find((place) => place.id === placeId) ?? null) : null),
    [placeId, places],
  );

  const remote = useQuery({
    queryKey: travelAtlasKeys.place(placeId ?? ''),
    queryFn: () => fetchPlaceById(placeId as string),
    enabled: Boolean(placeId) && !owned && !atlasLoading,
  });

  return {
    place: owned ?? remote.data ?? null,
    isLoading: atlasLoading || (!owned && remote.isLoading),
    isError: remote.isError,
  };
}

export function useNearbyPlaces(place: TravelPlace | null) {
  return useQuery({
    queryKey: travelAtlasKeys.nearby(place?.id ?? ''),
    queryFn: () =>
      fetchNearbyPlaces(place!.coordinates, { excludeId: place!.id, radiusMeters: 120000 }),
    enabled: Boolean(place),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrips() {
  return useQuery({
    queryKey: travelAtlasKeys.trips(),
    queryFn: () => offlineFirst('trips', fetchTrips, getCachedTrips, cacheTrips),
  });
}

export function useTrip(tripId: string | undefined) {
  const query = useTrips();
  const trip = useMemo(
    () => (tripId ? ((query.data ?? []).find((entry) => entry.id === tripId) ?? null) : null),
    [query.data, tripId],
  );
  return { ...query, trip };
}

// ── Mutations ───────────────────────────────────────────────────────────────

function usePlacesInvalidator() {
  const queryClient = useQueryClient();
  return async () => {
    await invalidateCache('places');
    await invalidateCache('countries');
    await queryClient.invalidateQueries({ queryKey: travelAtlasKeys.places() });
    await queryClient.invalidateQueries({ queryKey: travelAtlasKeys.countries() });
  };
}

export function useCreatePlace() {
  const invalidate = usePlacesInvalidator();
  return useMutation({
    mutationFn: (input: CreatePlaceInput) => createPlace(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePlace() {
  const queryClient = useQueryClient();
  const invalidate = usePlacesInvalidator();
  return useMutation({
    mutationFn: (input: UpdatePlaceInput) => updatePlace(input),
    onSuccess: async (place) => {
      queryClient.setQueryData(travelAtlasKeys.place(place.id), place);
      await invalidate();
    },
  });
}

export function useDeletePlace() {
  const invalidate = usePlacesInvalidator();
  return useMutation({
    mutationFn: (placeId: string) => deletePlace(placeId),
    onSuccess: invalidate,
  });
}

/**
 * Status and favourite toggles are the two controls a user taps repeatedly while
 * scanning a list, so both write to the cached list immediately and reconcile
 * afterwards. A 400 ms round trip before the pin changes colour reads as broken.
 */
function useOptimisticPlacePatch<TArgs>(
  mutationFn: (args: TArgs) => Promise<TravelPlace>,
  patch: (place: TravelPlace, args: TArgs) => TravelPlace,
  idOf: (args: TArgs) => string,
) {
  const queryClient = useQueryClient();
  const invalidate = usePlacesInvalidator();

  return useMutation({
    mutationFn,
    onMutate: async (args: TArgs) => {
      const key = travelAtlasKeys.places();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TravelPlace[]>(key);
      if (previous) {
        const id = idOf(args);
        queryClient.setQueryData<TravelPlace[]>(
          key,
          previous.map((place) => (place.id === id ? patch(place, args) : place)),
        );
      }
      return { previous };
    },
    onError: (_error, _args, context) => {
      if (context?.previous) {
        queryClient.setQueryData(travelAtlasKeys.places(), context.previous);
      }
    },
    onSettled: invalidate,
  });
}

export function useSetVisitStatus() {
  return useOptimisticPlacePatch<{ placeId: string; status: VisitStatus }>(
    ({ placeId, status }) => setPlaceVisitStatus(placeId, status),
    (place, { status }) => ({
      ...place,
      visitStatus: status,
      visitedOn:
        status === 'visited'
          ? (place.visitedOn ?? new Date().toISOString().slice(0, 10))
          : place.visitedOn,
    }),
    ({ placeId }) => placeId,
  );
}

export function useToggleFavorite() {
  return useOptimisticPlacePatch<{ placeId: string; isFavorite: boolean }>(
    ({ placeId, isFavorite }) => setPlaceFavorite(placeId, isFavorite),
    (place, { isFavorite }) => ({ ...place, isFavorite }),
    ({ placeId }) => placeId,
  );
}

export function useSetRating() {
  return useOptimisticPlacePatch<{ placeId: string; rating: number | null }>(
    ({ placeId, rating }) => setPlaceRating(placeId, rating),
    (place, { rating }) => ({ ...place, rating }),
    ({ placeId }) => placeId,
  );
}

export function useSetCoverPhoto() {
  const invalidate = usePlacesInvalidator();
  return useMutation({
    mutationFn: ({ placeId, photoId }: { placeId: string; photoId: string }) =>
      setCoverPhoto(placeId, photoId),
    onSuccess: invalidate,
  });
}

// ── Trip mutations ──────────────────────────────────────────────────────────

function useTripsInvalidator() {
  const queryClient = useQueryClient();
  return async () => {
    await invalidateCache('trips');
    await queryClient.invalidateQueries({ queryKey: travelAtlasKeys.trips() });
  };
}

export function useCreateTrip() {
  const invalidate = useTripsInvalidator();
  return useMutation({
    mutationFn: (fields: TripFields) => createTrip(fields),
    onSuccess: invalidate,
  });
}

export function useUpdateTrip() {
  const invalidate = useTripsInvalidator();
  return useMutation({
    mutationFn: ({ tripId, fields }: { tripId: string; fields: Partial<TripFields> }) =>
      updateTrip(tripId, fields),
    onSuccess: invalidate,
  });
}

export function useDeleteTrip() {
  const invalidate = useTripsInvalidator();
  return useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: invalidate,
  });
}

export function useAddTripStop() {
  const invalidate = useTripsInvalidator();
  return useMutation({
    mutationFn: ({
      tripId,
      placeId,
      dayIndex,
    }: {
      tripId: string;
      placeId: string;
      dayIndex?: number;
    }) => addTripStop(tripId, placeId, dayIndex ?? 1),
    onSuccess: invalidate,
  });
}

export function useRemoveTripStop() {
  const invalidate = useTripsInvalidator();
  return useMutation({
    mutationFn: (stopId: string) => removeTripStop(stopId),
    onSuccess: invalidate,
  });
}

export function useSaveTripStopOrder() {
  const queryClient = useQueryClient();
  const invalidate = useTripsInvalidator();
  return useMutation({
    mutationFn: (stops: { id: string; dayIndex: number; sortOrder: number }[]) =>
      saveTripStopOrder(stops),
    onMutate: async (stops) => {
      const key = travelAtlasKeys.trips();
      const previous = queryClient.getQueryData<TripWithStops[]>(key);
      if (previous) {
        const order = new Map(stops.map((stop) => [stop.id, stop]));
        queryClient.setQueryData<TripWithStops[]>(
          key,
          previous.map((trip) => ({
            ...trip,
            stops: trip.stops
              .map((stop) => {
                const next = order.get(stop.id);
                return next
                  ? { ...stop, dayIndex: next.dayIndex, sortOrder: next.sortOrder }
                  : stop;
              })
              .sort((a, b) => a.dayIndex - b.dayIndex || a.sortOrder - b.sortOrder),
          })),
        );
      }
      return { previous };
    },
    onError: (_error, _stops, context) => {
      if (context?.previous) queryClient.setQueryData(travelAtlasKeys.trips(), context.previous);
    },
    onSettled: invalidate,
  });
}

export function useUpdateTripStopNote() {
  const invalidate = useTripsInvalidator();
  return useMutation({
    mutationFn: ({ stopId, noteAr }: { stopId: string; noteAr: string | null }) =>
      updateTripStopNote(stopId, noteAr),
    onSuccess: invalidate,
  });
}
