# Travel Atlas — أطلس الرحلات

A personal travel guide: the places worth a journey, on real maps, with the
practical detail a frequent traveller needs on arrival.

## Surfaces

| Route                          | Screen                                     | What it answers                     |
| ------------------------------ | ------------------------------------------ | ----------------------------------- |
| `/travel-atlas`                | World map (globe) · places list · record   | "what does my travelling look like" |
| `/travel-atlas/explore`        | Full-detail street map                     | "what is around here"               |
| `/travel-atlas/countries`      | Dotted country-stamp poster                | "which countries have I been to"    |
| `/travel-atlas/:countryId`     | One country: map · list · country briefing | "what have I saved here"            |
| `/travel-atlas/place/:placeId` | The full place record                      | "tell me everything about this"     |
| `/travel-atlas/trips`          | Trip list                                  | "which plan am I working on"        |
| `/travel-atlas/trips/:tripId`  | Itinerary with times + packing list        | "what am I doing at 09:00 on day 2" |

Route order in `App.tsx` matters: `explore`, `countries`, `place/` and `trips` are
literal segments and must be matched **before** the `:countryId` wildcard.
`e2e/travel-atlas.spec.ts` pins that.

## Three maps, on purpose

They are not variants of one map — each answers a question the others answer badly.

|            | Overview (`/travel-atlas`) | Explore (`/explore`)          | Countries (`/countries`) |
| ---------- | -------------------------- | ----------------------------- | ------------------------ |
| Engine     | MapLibre, globe projection | MapLibre, mercator            | 2D canvas, no tiles      |
| Basemap    | quiet (positron)           | detailed (liberty) by default | none                     |
| Zoom       | 1.2 – 18                   | up to 19, street level        | fixed poster             |
| Shows      | country bubbles → pins     | streets, POIs, labels, pins   | one dot per 1.5° of land |
| A tap does | opens a country            | drops a pin, offers to save   | stamps a country         |

The explore map is the one that has to feel like a maps app: search, satellite,
current location, street-level detail, and a tap on empty ground that
reverse-geocodes and offers to save the spot.

The country map is the opposite bet. At country granularity a street map is noise,
so there are no tiles at all: the world is a grid of dots and a stamped country
fills in. It is drawn on a canvas rather than as ~6,800 SVG circles so a stamp
repaints in one frame on a phone. Canvas is invisible to assistive technology, so
the page always pairs it with a searchable country list — both the accessible path
and the faster one once the map is crowded.

### The dot grid asset

`scripts/travel/build-dot-grid.mjs` turns Natural Earth 1:110m country polygons
into `public/data/world-dots.json` (~72 kB, ~22 kB gzipped): 178 countries, 6,846
dots, and the Arabic name of every country. It is fetched, not imported, so it
never enters a JS chunk. The output is committed; re-run the script only if the
source data or the grid resolution changes.

Two decisions in it are load-bearing:

- **Smallest countries claim their dots first.** A dot is wider than Lebanon, so
  resolving big countries first silently erased Palestine, Lebanon, Bahrain, Qatar
  and a dozen others into a larger neighbour. On a map whose purpose is stamping
  countries, a country you cannot see is a country you cannot stamp.
- **Micro-states are added by hand.** The 1:110m dataset omits Bahrain, Singapore
  and the Maldives entirely — three places this app's readers travel to more than
  most of the 174 countries that are in it.

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

### Two silent failures worth remembering

Both of these made the map render as a blank rectangle with **no error anywhere** —
no console message, no failed request, no exception. They are now covered by
`e2e/travel-atlas.spec.ts › travel atlas maps`.

1. **The container collapsed.** MapLibre adds a `.maplibregl-map` class to the
   element it is handed, and its stylesheet declares `position: relative` on that
   class. The stylesheet loads after Tailwind's utilities, so it beat
   `absolute inset-0`: the insets stopped applying, the element's height went to
   zero, and the canvas fell back to its intrinsic 300 px. The container is now
   sized with `h-full w-full`, which cannot be overridden the same way.

2. **The tile worker was never served.** MapLibre parses vector tiles in a Web
   Worker whose URL it derives from its own `import.meta.url`, expecting a sibling
   `maplibre-gl-worker.mjs`. Vite never emits that file, so the worker 404'd and
   _not one_ `.pbf` was ever requested — the map drew only its low-zoom raster
   layer, which looks like a plausible map at world zoom and like a blank page over
   a city. Fixed by importing the worker with Vite's `?worker&url` and passing the
   emitted URL to `setWorkerUrl()` before the first map is constructed.

Also note: `setProjection()` must be called **after** the style loads. On a fresh
map it is silently discarded, because loading a style applies that style's own
projection — which is mercator — so the globe quietly reverted to flat.

MapLibre (~950 kB) and its stylesheet (~70 kB) are dynamically imported inside
`MapController.attach()`, so they never reach a visitor who does not open a map.
`isWebglAvailable()` is probed first; without WebGL every map surface renders a
list fallback instead of a blank rectangle.

Basemaps (`data/mapStyles.ts`): OpenFreeMap positron / liberty / dark, plus Esri
World Imagery as an inline raster style. All key-free, all attributed.

## Applying the schema

The feature degrades quietly by design — a missing table or column is caught in
`api.ts` and shown as an empty atlas rather than an error screen. That is right
for a user and useless for a deploy: "my places don't save" looks exactly like "I
have no places yet".

So there are two operational tools:

- **`supabase/migrations/APPLY_TRAVEL_ATLAS.sql`** — the two travel migrations
  consolidated into one idempotent paste-once file for the Supabase SQL editor.
  It only ever adds columns, tables, policies and indexes; running it twice
  changes nothing. It carries no timestamp prefix, so no migration runner picks
  it up — the real history stays in the two dated files.
- **`node scripts/travel/check-db.mjs`** — probes the live project with the
  publishable key and prints exactly which migration is missing. It needs no
  secrets: a missing relation answers `PGRST205`, a missing column `42703`, and a
  table that exists but refuses an anonymous read (trips, country stamps) answers
  401/403, which the script correctly reads as "present, private by design".

## Countries

Two lists used to exist and only one was reachable. The curated catalog
(`data/countriesCatalog.ts`, 78 entries with hand-written Arabic names and
regions tuned for this audience) fed the place form, so **a place in Rwanda or
Uruguay simply could not be saved** — the country was not on the list. Meanwhile
the dotted stamp map already knew all 178.

`data/countryRegistry.ts` merges them, curated-wins: where a country appears in
both, the hand-written name and the region (الخليج / المشرق / شمال أفريقيا rather
than a flat "Asia") are kept; everything else comes from
`data/worldCountries.generated.ts`, emitted by the same dot-grid script with a
real bounding box per country. It is a static module rather than a fetch because
country selection has to be synchronous, and 178 rows of two names and four
numbers is ~25 kB.

`atlasCountryAt()` is a **rectangle** test, not a polygon test: open water inside
a country's box resolves to that country. Deliberate — the alternative is
shipping ~840 kB of polygons to answer a question whose only uses are
pre-selecting a dropdown and _warning_ about a mismatch. Neither ever overrides
what the user chose.

## Data

One Supabase chokepoint: `api.ts`. Nothing else in the feature touches the
database.

`fetchMyPlaces()` returns the **whole** personal atlas in one request, and every
other view slices it (`useCountryPlaces`, `usePlace`, the filters, the stats). A
private travel journal is hundreds of rows, not millions, so this makes each
screen instant, makes the offline cache trivially correct, and removes any chance
of two overlapping queries disagreeing.

`offlineCache.ts` is a Dexie v3 mirror (countries · places · trips · stamps) read
stale-while-revalidate. Travel is exactly when the network is worst.

That store is **not** user-scoped, which is why `signOut()` in
`src/hooks/useAuth.tsx` clears it. It is the only IndexedDB cache in the app
holding another account's content, so without that call the next person to use the
device would be served the previous account's saved places. It is imported
dynamically there so a global auth hook does not pull Dexie and a feature's data
layer into its chunk for every visitor.

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

## Country stamps and the record

A country is stamped as a whole, independently of the places inside it — and the
two halves must not contradict each other:

- `computePassport()` counts countries as the **union** of "holds a saved place"
  and "is stamped". A country can be stamped with nothing pinned in it; counting
  only the former would under-report the record and disagree with the map.
- Marking a place visited **auto-stamps its country** (`stampCountryOf` in
  `api.ts`). Otherwise someone ticks off a café in Tbilisi and Georgia stays
  blank on the poster, waiting to be stamped by hand. The upsert uses
  `ignoreDuplicates`, so an existing stamp — its status, year, visit count and
  note — is never overwritten. It is a convenience, not a requirement: a failure
  is logged and the place is still saved.

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
