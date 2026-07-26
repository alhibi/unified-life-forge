/** React Query key factory for the atlas — one place to look when invalidating. */
export const travelAtlasKeys = {
  all: ['travel-atlas'] as const,
  countries: () => [...travelAtlasKeys.all, 'countries'] as const,
  places: () => [...travelAtlasKeys.all, 'places'] as const,
  place: (placeId: string) => [...travelAtlasKeys.all, 'place', placeId] as const,
  nearby: (placeId: string) => [...travelAtlasKeys.all, 'nearby', placeId] as const,
  trips: () => [...travelAtlasKeys.all, 'trips'] as const,
  stamps: () => [...travelAtlasKeys.all, 'stamps'] as const,
} as const;
