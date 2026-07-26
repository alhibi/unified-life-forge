/**
 * Public surface of the Travel Atlas feature.
 *
 * Everything else under `features/travel-atlas/` is internal. Other features and
 * the router import from here so the internal layout can move without a
 * repo-wide rename.
 */
export { useAtlas, useCountryPlaces, useMyPlaces, usePlace, useTrips } from './hooks';
export { default as CountryMapPage } from './pages/CountryMapPage';
export { default as PlaceDetailPage } from './pages/PlaceDetailPage';
export { default as TravelAtlasPage } from './pages/TravelAtlasPage';
export { default as TripDetailPage } from './pages/TripDetailPage';
export { default as TripsPage } from './pages/TripsPage';
export { travelAtlasKeys } from './queryKeys';
export type {
  Coordinates,
  CountryBounds,
  PlaceCategory,
  PlaceLink,
  PlacePhoto,
  TravelCountry,
  TravelPlace,
  Trip,
  TripStop,
  TripWithStops,
  VisitStatus,
} from './types';
