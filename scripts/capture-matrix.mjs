#!/usr/bin/env node
/**
 * Design verification capture v2 — matrix screenshots with a pinned profile.
 *
 * Captures every route (or a subset) in a deterministic environment:
 *   - appearance profile written to localStorage before first paint
 *   - external data origins blocked; font origins allowed (static, design-critical)
 *   - reduced motion forced, Arabic locale, Riyadh timezone
 *   - overflow / h1 / page error diagnostics recorded next to each shot
 *
 *   node scripts/capture-matrix.mjs --out verification/design/matrix --routes all
 *   node scripts/capture-matrix.mjs --out /tmp/s --routes /,/crypto --viewports 390x844
 *   node scripts/capture-matrix.mjs --out /tmp/s --routes /games/chess --modes dark --viewport-top-only
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  installAnonymousRoutes,
  installAuthFixture,
  installSignedInRoutes,
  readProjectRef,
} from './lib/session-fixture.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
function flag(name) {
  return args.includes('--' + name);
}

const FIXTURES = {
  categoryId: '1',
  chatId: '00000000-0000-0000-0000-000000000000',
  countryId: 'DE',
  id: '1',
  placeId: '1',
  slug: 'test-slug',
  tripId: '1',
};

function extractRoutes() {
  const source = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  const found = new Set();
  for (const m of source.matchAll(/path\s*=\s*["'\x60]([^"'\x60]+)["'\x60]/g)) {
    if (m[1] !== '*') found.add(m[1]);
  }
  return [...found].map((r) => r.replace(/:([A-Za-z0-9_]+)\??/g, (_w, n) => FIXTURES[n] ?? '1')).sort();
}

const routeArg = arg('routes', 'all');
const ROUTES = routeArg === 'all' ? extractRoutes() : routeArg.split(',').filter(Boolean);
const VIEWPORTS = arg('viewports', '390x844,1440x900').split(',').map((v) => {
  const [width, height] = v.split('x').map(Number);
  return { name: v, width, height };
});
const MODES = arg('modes', 'dark').split(',').filter(Boolean);
const THEMES = arg('themes', 'expressive').split(',').filter(Boolean);
const BASE = arg('base', 'http://127.0.0.1:5199');
const OUT = path.resolve(arg('out', 'verification/design/matrix'));
const CONCURRENCY = Math.max(1, Math.min(6, Number(arg('concurrency', '4'))));
// --session signed-in captures the deterministic signed-in states (synthetic
// session + stubbed Supabase). Default anonymous keeps the original matrix.
const SESSION = arg('session', 'anonymous');
const SIGNED_IN = SESSION === 'signed-in' || SESSION === 'signedin';
const PROJECT_REF = readProjectRef(ROOT);
const FULL = !flag('viewport-top-only');
const WAIT = Number(arg('wait', '1200'));

const PROFILE = {
  'app-theme': 'dark',
  'app-color-theme': 'expressive',
  'app-palette-style': 'tonal',
  'app-black-mode': 'false',
  'app-surface-lift': 'subtle',
  'app-ui-density': 'cozy',
  'app-content-width': 'standard',
  'app-reduced-motion': 'true',
  'app-clearer-focus': 'false',
  'app-stronger-contrast': 'false',
};

const browser = await chromium.launch();
const results = [];

function slugOf(route) {
  return route === '/' ? 'root' : route.replace(/^\/+|\/+$/g, '').replaceAll('/', '_');
}

async function capture(route, viewport, mode, theme) {
  // Session is part of the evidence path: an anonymous and a signed-in capture
  // of the same route are different states and must never overwrite each other.
  const dir = path.join(OUT, SIGNED_IN ? 'signed-in' : 'anonymous', viewport.name, theme + '-' + mode);
  fs.mkdirSync(dir, { recursive: true });
  const slug = slugOf(route);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.width < 500 ? 2 : 1,
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    reducedMotion: 'reduce',
    colorScheme: mode,
  });
  await context.addInitScript(
    ({ profile, mode, theme }) => {
      try {
        for (const [k, v] of Object.entries(profile)) localStorage.setItem(k, v);
        localStorage.setItem('app-theme', mode);
        localStorage.setItem('app-color-theme', theme);
      } catch { /* storage disabled */ }
    },
    { profile: PROFILE, mode, theme },
  );
  if (SIGNED_IN) await installAuthFixture(context, { projectRef: PROJECT_REF, theme, mode });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  if (SIGNED_IN) await installSignedInRoutes(page, PROJECT_REF);
  else await installAnonymousRoutes(page);
  const row = { route, viewport: viewport.name, mode, theme, session: SESSION, files: [] };
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
    await page.waitForLoadState('load').catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(WAIT);
    row.status = 200;
    row.h1 = await page.locator('h1').first().textContent().catch(() => null);
    row.h1Count = await page.locator('h1').count();
    row.overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ).catch(() => null);
    const topFile = path.join(dir, slug + '.png');
    await page.screenshot({ path: topFile, animations: 'disabled' });
    row.files.push(topFile);
    if (FULL) {
      const fullFile = path.join(dir, slug + '--full.png');
      try {
        await page.screenshot({ path: fullFile, animations: 'disabled', fullPage: true });
        row.files.push(fullFile);
      } catch (fullError) {
        // Chromium refuses screenshots of extremely tall virtualised pages;
        // record the limitation instead of losing the viewport shot.
        row.fullPageError = String(fullError).split('\n')[0].slice(0, 120);
      }
    }
  } catch (e) {
    row.error = String(e).split('\n')[0].slice(0, 200);
  }
  row.pageErrors = pageErrors;
  row.consoleErrors = consoleErrors;
  await context.close();
  results.push(row);
  return row;
}

const tasks = [];
for (const vp of VIEWPORTS) for (const mode of MODES) for (const theme of THEMES) for (const route of ROUTES) tasks.push({ route, vp, mode, theme });

let cursor = 0;
async function worker() {
  while (cursor < tasks.length) {
    const t = tasks[cursor++];
    const row = await capture(t.route, t.vp, t.mode, t.theme);
    if (row.error || row.overflow > 1 || row.h1Count === 0 || row.pageErrors.length) {
      console.log('WARN', JSON.stringify({ route: row.route, vp: row.viewport, error: row.error, overflow: row.overflow, h1: row.h1Count, pageErrors: row.pageErrors.slice(0, 2) }));
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
fs.mkdirSync(OUT, { recursive: true });
const manifest = path.resolve(arg('json-out', path.join(OUT, 'manifest.json')));
fs.writeFileSync(
  manifest,
  JSON.stringify(
    { capturedAt: new Date().toISOString(), base: BASE, session: SESSION, profile: PROFILE, results },
    null,
    1,
  ),
);
const bad = results.filter((r) => r.error || (r.overflow ?? 0) > 1 || r.h1Count === 0 || r.pageErrors.length);
console.log(JSON.stringify({ captured: results.length, routes: ROUTES.length, viewports: VIEWPORTS.length, session: SESSION, modes: MODES, themes: THEMES, warnings: bad.length, out: OUT, manifest }, null, 2));
process.exit(bad.length ? 1 : 0);
