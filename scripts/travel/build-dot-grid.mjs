#!/usr/bin/env node
/**
 * Builds the dotted world map asset.
 *
 *   node scripts/travel/build-dot-grid.mjs
 *
 * The country-stamp map is a poster, not a slippy map: the world is a uniform
 * grid of dots, and the dots belonging to a country fill in once it is stamped.
 * That look needs one thing the app does not otherwise have — which dot belongs
 * to which country — and computing it in the browser would mean shipping ~840 kB
 * of Natural Earth polygons and running point-in-polygon on every load.
 *
 * So it is precomputed here, once, into a single ~100 kB asset that carries the
 * dots AND the Arabic country names. The polygons never reach the client.
 *
 * Source: Natural Earth 1:110m admin-0 countries (public domain).
 * https://github.com/nvkelso/natural-earth-vector
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const OUT = path.resolve(import.meta.dirname, '../../public/data/world-dots.json');

/**
 * Grid resolution. 1.5° gives ~9k land dots: dense enough that Italy still reads
 * as Italy, sparse enough to stay one small JSON and to draw in a single frame.
 */
const STEP = 1.5;
/** Antarctica is a band of noise at the bottom of a travel poster. */
const MIN_LAT = -56;
/** Above this there is only ice and a handful of Svalbard dots. */
const MAX_LAT = 83;

/** Natural Earth marks disputed/unrecognised entries with -99. */
function isoOf(properties) {
  for (const key of ['ISO_A2_EH', 'ISO_A2', 'ADM0_ISO']) {
    const value = properties[key];
    if (typeof value === 'string' && value.length === 2 && value !== '-9') return value;
  }
  return null;
}

const CONTINENT_AR = {
  Africa: 'أفريقيا',
  Asia: 'آسيا',
  Europe: 'أوروبا',
  'North America': 'أمريكا الشمالية',
  'South America': 'أمريكا الجنوبية',
  Oceania: 'أوقيانوسيا',
  Antarctica: 'أنتاركتيكا',
  'Seven seas (open ocean)': 'المحيطات',
};

/** Ray casting over one ring. */
function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** A polygon is [outerRing, ...holes]. */
function inPolygon(polygon, x, y) {
  if (!inRing(polygon[0], x, y)) return false;
  for (let h = 1; h < polygon.length; h += 1) {
    if (inRing(polygon[h], x, y)) return false;
  }
  return true;
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function bboxOf(polygons) {
  let minX = 180;
  let minY = 90;
  let maxX = -180;
  let maxY = -90;
  for (const polygon of polygons) {
    for (const [x, y] of polygon[0]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

const response = await fetch(SOURCE);
if (!response.ok) {
  console.error(`Could not download Natural Earth data: HTTP ${response.status}`);
  process.exit(1);
}
const geojson = await response.json();

const cols = Math.round(360 / STEP);
const rows = Math.round((MAX_LAT - MIN_LAT) / STEP);

/** Column/row → lon/lat of the dot's centre. */
const lonAt = (col) => -180 + (col + 0.5) * STEP;
const latAt = (row) => MAX_LAT - (row + 0.5) * STEP;

const countries = [];
/** iso → polygon bounding box, for the generated TypeScript module only. */
const countryBoxes = new Map();
/** iso → Natural Earth CONTINENT, mapped to the app's regions in TypeScript. */
const continents = new Map();
let dotCount = 0;
/** One dot belongs to one country; first match wins so borders do not double up. */
const claimed = new Set();

/**
 * SMALLEST countries are resolved first.
 *
 * At 1.5° a dot is wider than Lebanon, so whoever claims a shared cell first
 * keeps it. Resolving big countries first silently erased Palestine, Lebanon,
 * Bahrain, Qatar, Singapore and a dozen others — absorbed by a larger
 * neighbour. On a map whose whole purpose is stamping countries, a country you
 * cannot see is a country you cannot stamp, and Russia does not miss one dot.
 */
const features = [...geojson.features].sort((a, b) => bboxArea(a.geometry) - bboxArea(b.geometry));

function bboxArea(geometry) {
  const polygons = polygonsOf(geometry);
  if (polygons.length === 0) return Number.POSITIVE_INFINITY;
  const box = bboxOf(polygons);
  return (box.maxX - box.minX) * (box.maxY - box.minY);
}

for (const feature of features) {
  const iso = isoOf(feature.properties);
  if (!iso) continue;
  const polygons = polygonsOf(feature.geometry);
  if (polygons.length === 0) continue;

  const box = bboxOf(polygons);
  const dots = [];

  const colStart = Math.max(0, Math.floor((box.minX + 180) / STEP) - 1);
  const colEnd = Math.min(cols - 1, Math.ceil((box.maxX + 180) / STEP) + 1);
  const rowStart = Math.max(0, Math.floor((MAX_LAT - box.maxY) / STEP) - 1);
  const rowEnd = Math.min(rows - 1, Math.ceil((MAX_LAT - box.minY) / STEP) + 1);

  for (let row = rowStart; row <= rowEnd; row += 1) {
    const lat = latAt(row);
    if (lat < MIN_LAT || lat > MAX_LAT) continue;
    for (let col = colStart; col <= colEnd; col += 1) {
      const key = row * cols + col;
      if (claimed.has(key)) continue;
      const lon = lonAt(col);
      if (!polygons.some((polygon) => inPolygon(polygon, lon, lat))) continue;
      claimed.add(key);
      dots.push([col, row]);
    }
  }

  // A country smaller than one grid cell still has to be stampable, so it gets
  // the nearest free cell to its centre rather than disappearing.
  if (dots.length === 0) {
    const fallback = nearestFreeCell((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2);
    if (!fallback) continue;
    claimed.add(fallback.row * cols + fallback.col);
    dots.push([fallback.col, fallback.row]);
  }

  dotCount += dots.length;

  // The bounding box is kept for the generated TypeScript module: the place form
  // needs it to frame its map on the chosen country and to sanity-check a picked
  // point. It is deliberately NOT written into the JSON asset — the dotted map
  // never needs it, and the asset is fetched by every visitor of that screen.
  countryBoxes.set(iso, box);
  continents.set(iso, feature.properties.CONTINENT ?? '');

  countries.push({
    iso,
    ar: feature.properties.NAME_AR || feature.properties.NAME_EN || iso,
    en: feature.properties.NAME_EN || feature.properties.NAME || iso,
    cont: CONTINENT_AR[feature.properties.CONTINENT] ?? '',
    // Label anchor: the centroid of the country's own dots, which always sits on
    // land — unlike a bounding-box centre, which can land in the sea.
    at: [
      Math.round(dots.reduce((sum, [col]) => sum + col, 0) / dots.length),
      Math.round(dots.reduce((sum, [, row]) => sum + row, 0) / dots.length),
    ],
    dots,
  });
}

/**
 * The 1:110m dataset drops states below a size threshold entirely — including
 * Bahrain, Singapore and the Maldives, which this app's readers travel to more
 * than most of the 174 countries that ARE in it. They are added by hand from
 * their capital coordinates; each gets one dot, which is all a stamp needs.
 */
const MICRO_STATES = [
  {
    iso: 'BH',
    ar: 'البحرين',
    en: 'Bahrain',
    cont: 'آسيا',
    ne: 'Asia',
    lon: 50.55,
    lat: 26.05,
    pad: 0.35,
  },
  {
    iso: 'SG',
    ar: 'سنغافورة',
    en: 'Singapore',
    cont: 'آسيا',
    ne: 'Asia',
    lon: 103.82,
    lat: 1.35,
    pad: 0.25,
  },
  {
    iso: 'MV',
    ar: 'المالديف',
    en: 'Maldives',
    cont: 'آسيا',
    ne: 'Asia',
    lon: 73.5,
    lat: 4.2,
    pad: 4,
  },
  {
    iso: 'MT',
    ar: 'مالطا',
    en: 'Malta',
    cont: 'أوروبا',
    ne: 'Europe',
    lon: 14.4,
    lat: 35.9,
    pad: 0.25,
  },
  {
    iso: 'LU',
    ar: 'لوكسمبورغ',
    en: 'Luxembourg',
    cont: 'أوروبا',
    ne: 'Europe',
    lon: 6.13,
    lat: 49.81,
    pad: 0.4,
  },
];

for (const state of MICRO_STATES) {
  if (countries.some((country) => country.iso === state.iso)) continue;
  const cell = nearestFreeCell(state.lon, state.lat);
  if (!cell) continue;
  claimed.add(cell.row * cols + cell.col);
  dotCount += 1;
  // No polygon to measure, so the box is a small window around the capital —
  // enough for the picker to open on the country rather than the hemisphere.
  const pad = state.pad ?? 0.6;
  countryBoxes.set(state.iso, {
    minX: state.lon - pad,
    minY: state.lat - pad,
    maxX: state.lon + pad,
    maxY: state.lat + pad,
  });
  continents.set(state.iso, state.ne);
  countries.push({
    iso: state.iso,
    ar: state.ar,
    en: state.en,
    cont: state.cont,
    at: [cell.col, cell.row],
    dots: [[cell.col, cell.row]],
  });
}

/** Spiral outwards from a lon/lat until an unclaimed cell turns up. */
function nearestFreeCell(lon, lat) {
  const baseCol = Math.round((lon + 180) / STEP - 0.5);
  const baseRow = Math.round((MAX_LAT - lat) / STEP - 0.5);
  for (let radius = 0; radius <= 3; radius += 1) {
    for (let dRow = -radius; dRow <= radius; dRow += 1) {
      for (let dCol = -radius; dCol <= radius; dCol += 1) {
        if (Math.max(Math.abs(dRow), Math.abs(dCol)) !== radius) continue;
        const col = baseCol + dCol;
        const row = baseRow + dRow;
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        if (claimed.has(row * cols + col)) continue;
        return { col, row };
      }
    }
  }
  return null;
}

countries.sort((a, b) => a.iso.localeCompare(b.iso));

const payload = { step: STEP, cols, rows, minLat: MIN_LAT, maxLat: MAX_LAT, countries };
writeFileSync(OUT, JSON.stringify(payload), 'utf8');

/**
 * Also emit a TypeScript module with every country's names and bounding box.
 *
 * The place form used to offer only the 78 hand-written catalog entries, so a
 * place in Rwanda or Uruguay simply could not be saved. The polygons needed to
 * fix that are already parsed here, so the full list ships as a static module
 * rather than a fetch: country selection has to be synchronous, and 178 rows of
 * two names and four numbers is ~20 kB.
 *
 * The curated catalog stays authoritative where the two overlap — its Arabic
 * names and its Gulf/Levant/Maghreb grouping suit this audience better than
 * Natural Earth's flat continents. See `data/countryRegistry.ts`.
 */
const round = (value) => Math.round(value * 100) / 100;
const tsRows = countries
  .map((country) => {
    const box = countryBoxes.get(country.iso);
    return (
      `  { iso: '${country.iso}', nameAr: ${JSON.stringify(country.ar)}, ` +
      `nameEn: ${JSON.stringify(country.en)}, ` +
      `continent: ${JSON.stringify(continents.get(country.iso) ?? '')}, ` +
      `bounds: { sw: [${round(box.minX)}, ${round(box.minY)}], ne: [${round(box.maxX)}, ${round(box.maxY)}] } },`
    );
  })
  .join('\n');

writeFileSync(
  path.resolve(
    import.meta.dirname,
    '../../src/features/travel-atlas/data/worldCountries.generated.ts',
  ),
  `// GENERATED FILE — do not edit by hand.
// Run: node scripts/travel/build-dot-grid.mjs
//
// Every country on the dotted world map, with the bounding box the place form
// needs to frame its picker and to sanity-check a picked point. Derived from
// Natural Earth 1:110m (public domain); Arabic names are its own NAME_AR field.
// Boxes are rounded to two decimals — about a kilometre, far finer than a
// country-framing camera needs.

import type { CountryBounds } from '../types';

export interface GeneratedCountry {
  iso: string;
  nameAr: string;
  nameEn: string;
  /** Natural Earth CONTINENT, mapped to the app's regions in the registry. */
  continent: string;
  bounds: CountryBounds;
}

export const WORLD_COUNTRIES: readonly GeneratedCountry[] = [
${tsRows}
] as const;
`,
  'utf8',
);

const bytes = JSON.stringify(payload).length;
console.log(
  `world-dots.json: ${countries.length} countries, ${dotCount} dots, ` +
    `${(bytes / 1024).toFixed(0)} kB (${cols}×${rows} grid at ${STEP}°)`,
);
