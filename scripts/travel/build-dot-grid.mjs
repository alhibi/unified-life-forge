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
  { iso: 'BH', ar: 'البحرين', en: 'Bahrain', cont: 'آسيا', lon: 50.55, lat: 26.05 },
  { iso: 'SG', ar: 'سنغافورة', en: 'Singapore', cont: 'آسيا', lon: 103.82, lat: 1.35 },
  { iso: 'MV', ar: 'المالديف', en: 'Maldives', cont: 'آسيا', lon: 73.5, lat: 4.2 },
  { iso: 'MT', ar: 'مالطا', en: 'Malta', cont: 'أوروبا', lon: 14.4, lat: 35.9 },
  { iso: 'LU', ar: 'لوكسمبورغ', en: 'Luxembourg', cont: 'أوروبا', lon: 6.13, lat: 49.81 },
];

for (const state of MICRO_STATES) {
  if (countries.some((country) => country.iso === state.iso)) continue;
  const cell = nearestFreeCell(state.lon, state.lat);
  if (!cell) continue;
  claimed.add(cell.row * cols + cell.col);
  dotCount += 1;
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

const bytes = JSON.stringify(payload).length;
console.log(
  `world-dots.json: ${countries.length} countries, ${dotCount} dots, ` +
    `${(bytes / 1024).toFixed(0)} kB (${cols}×${rows} grid at ${STEP}°)`,
);
