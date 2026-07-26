# Travel Atlas — أطلس الرحلات

A personal travel guide: the places worth a journey, on real maps, with the
practical detail a frequent traveller needs on arrival.

## Surfaces

| Route                          | Screen                                     | What it answers                     |
| ------------------------------ | ------------------------------------------ | ----------------------------------- |
| `/travel-atlas`                | World map (globe) · places list · record   | "what does my travelling look like" |
| `/travel-atlas/:countryId`     | One country: map · list · country briefing | "what have I saved here"            |
| `/travel-atlas/place/:placeId` | The full place record                      | "tell me everything about this"     |
| `/travel-atlas/trips`          | Trip list                                  | "which plan am I working on"        |
| `/travel-atlas/trips/:tripId`  | Day-by-day itinerary                       | "what am I doing on day 2"          |

Route order in `App.tsx` matters: `place/` and `trips` are literal segments and
must be matched **before** the `:countryId` wildcard. `e2e/travel-atlas.spec.ts`
pins that.

## The zoom ladder

The core interaction is one continuous gesture from a globe to a single café:

| Zoom              | What renders                                                          |
| ----------------- | --------------------------------------------------------------------- |
| < 4.6 (world map) | one bubble per country, area ∝ number of saved places                 |
| 4.6 – 10.5        | grid clusters, cell shrinking from 92 px to 56 px as regions separate |
| ≥ 10.5            | every place as a 44 px circular marker showing its own cover photo    |
| ≥ 12.5            | names appear beside the markers                                       |

Clustering is ours (`lib/clustering.ts`), not MapLibre's. Three reasons:

1. Markers must be React — each is a photo with its own loading and press
   behaviour — and `querySourceFeatures` only answers for tiles that happen to be
   loaded, which made pins blink in and out while panning.
2. The whole atlas is already in memory, so grid bucketing in screen space is
   cheaper than maintaining a second clustered copy inside the GL source.
3. Clicking a cluster can then zoom to the exact bounding box of its members
   instead of guessing an expansion zoom.

## Map engine

`lib/mapController.ts` owns the MapLibre instance as a plain observable class.
React reads it through `useSyncExternalStore` (`components/map/useMapController.ts`).

Why not hold the map in state: a map is a long-lived imperative object with its
own animation loop. Rebuilding it on a prop change loses the camera and flashes
white; storing it from an effect means a double render on mount and a tear during
page transitions. The controller is created once by a lazy state initialiser, and
reactive props (basemap, projection) are pushed in imperatively.

Marker positions are written straight to `style.transform` inside a
`requestAnimationFrame` on the map's own `move` events
(`components/map/useProjectedNodes.ts`) — never through React state. Re-rendering
dozens of components per frame drops a phone to single-digit FPS.

MapLibre (~950 kB) and its stylesheet (~70 kB) are dynamically imported inside
`MapController.attach()`, so they never reach a visitor who does not open a map.
`isWebglAvailable()` is probed first; without WebGL every map surface renders a
list fallback instead of a blank rectangle.

Basemaps (`data/mapStyles.ts`): OpenFreeMap positron / liberty / dark, plus Esri
World Imagery as an inline raster style. All key-free, all attributed.

## Data

One Supabase chokepoint: `api.ts`. Nothing else in the feature touches the
database.

`fetchMyPlaces()` returns the **whole** personal atlas in one request, and every
other view slices it (`useCountryPlaces`, `usePlace`, the filters, the stats). A
private travel journal is hundreds of rows, not millions, so this makes each
screen instant, makes the offline cache trivially correct, and removes any chance
of two overlapping queries disagreeing.

`offlineCache.ts` is a Dexie v2 mirror (countries · places · trips) read
stale-while-revalidate. Travel is exactly when the network is worst.

Photos use **public** URLs, not signed ones: the bucket is public, and one-hour
signed URLs silently broke every photo held in the offline cache — the case the
cache exists for.

### Tables

`countries` (public reference data, seeded on demand from `data/countriesCatalog.ts`)
· `places` · `place_photos` · `place_links` · `trips` · `trip_places`, plus the
`travel_places_nearby()` PostGIS RPC. See
`supabase/migrations/20260726120000_travel_atlas_v2.sql`.

That migration also fixes two defects that made v1 unusable:

- `countries.center` was `NOT NULL` and nothing ever supplied it, so saving the
  first place in a new country failed on a not-null violation.
- The storage policies required object paths beginning with the owning place's
  UUID while the client uploaded to `<user_id>/<place_id>/…`, so every photo
  upload was rejected by RLS. Paths are now owner-scoped, which also lets an
  upload happen before the place row exists.

## Design decisions worth keeping

- **Categories are glyphs, not colours.** Sixteen coloured pins on one map is
  confetti, and the design system allows one accent. The only colour encoding is
  visit status — three values (`wishlist` · `planned` · `visited`), which is the
  axis a traveller actually scans for.
- **The location picker moves the map, not the pin.** The pin is fixed to the
  centre of the viewport. Dragging a small pin with a fingertip that completely
  covers it is the classic failure of "choose a point" flows.
- **Tapping a pin opens a card, not a modal sheet.** A modal would block the map
  behind it, and the point of tapping a pin is to keep looking around.
- **`bestMonths` is twelve flags, not prose.** Free text cannot be filtered or
  charted; the flags drive the season strip, the month filter and the passport
  histogram. The prose note survives as a separate field for the nuance.
- **The place form is one scroll, not a wizard.** Only the name and the point are
  required, so a place can be saved in fifteen seconds standing in the street and
  enriched later — which is how notes actually get taken.

## Testing

- `lib/geo.test.ts`, `lib/clustering.test.ts`, `lib/stats.test.ts`,
  `lib/filtering.test.ts` — the pure logic (geodesy, clustering ladder, derived
  stats, Arabic-aware search).
- `e2e/travel-atlas.spec.ts` — route ordering and the signed-out/offline
  degradation of all five surfaces.

`e2e/fixtures.ts` stubs the basemap style with a valid empty MapLibre style, so
the specs exercise real map wiring with no tile traffic.
