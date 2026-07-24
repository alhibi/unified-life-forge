import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPlace,
  fetchCountryPlaces,
  fetchTravelCountries,
  fetchTravelCountry,
  type CreatePlaceInput,
} from './api';

export const travelAtlasKeys = {
  all: ['travel-atlas'] as const,
  countries: () => [...travelAtlasKeys.all, 'countries'] as const,
  country: (countryId: string) => [...travelAtlasKeys.countries(), countryId] as const,
  places: (countryId: string) => [...travelAtlasKeys.all, 'places', countryId] as const,
};

export function useTravelCountries() {
  return useQuery({
    queryKey: travelAtlasKeys.countries(),
    queryFn: fetchTravelCountries,
  });
}

export function useTravelCountry(countryId: string | undefined) {
  return useQuery({
    queryKey: travelAtlasKeys.country(countryId ?? ''),
    queryFn: () => fetchTravelCountry(countryId!),
    enabled: Boolean(countryId),
  });
}

export function useCountryPlaces(countryId: string | undefined) {
  return useQuery({
    queryKey: travelAtlasKeys.places(countryId ?? ''),
    queryFn: () => fetchCountryPlaces(countryId!),
    enabled: Boolean(countryId),
  });
}

export function useCreatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlaceInput) => createPlace(input),
    onSuccess: (place) => {
      qc.invalidateQueries({ queryKey: travelAtlasKeys.countries() });
      qc.invalidateQueries({ queryKey: travelAtlasKeys.places(place.countryId) });
      qc.invalidateQueries({ queryKey: travelAtlasKeys.country(place.countryId) });
    },
  });
}
