#!/usr/bin/env node
/**
 * Route audit — the missing half of the smoke net.
 *
 * The jsdom smoke suite answers "does this route mount?". This script answers
 * the questions a browser has to answer: does any route overflow horizontally,
 * fall back to the error boundary, lose its heading, or throw? It also keeps a
 * 390px screenshot of every route so the visual matrix is inspectable instead
 * of assumed.
 *
 *   node scripts/audit-routes.mjs                      all routes, 390 + 1440
 *   node scripts/audit-routes.mjs --routes /,/weather   subset
 *   node scripts/audit-routes.mjs --shots /tmp/shots    screenshot dir
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = process.env.AUDIT_BASE ?? 'http://127.0.0.1:4173';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf('--' + name);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
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
  for (const match of source.matchAll(/path\s*=\s*["'\x60]([^"'\x60]+)["'\x60]/g)) {
    if (match[1] !== '*') found.add(match[1]);
  }
  return [...found]
    .map((route) => route.replace(/:([A-Za-z0-9_]+)\??/g, (_whole, name) => FIXTURES[name] ?? '1'))
    .sort();
}

const only = arg('routes', null);
const ROUTES = only ? only.split(',').filter(Boolean) : extractRoutes();
const SHOTS = path.resolve(arg('shots', 'verification/design/routes-390'));
const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '1440x900', width: 1440, height: 900 },
];

const browser = await chromium.launch();
const report = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.width < 500 ? 2 : 1,
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  await context.addInitScript(() => {
    const set = (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage blocked */
      }
    };
    set('app-theme', 'dark');
    set('app-color-theme', 'expressive');
    set('app-palette-style', 'tonal');
    set('app-black-mode', 'false');
    set('app-surface-lift', 'subtle');
    set('app-ui-density', 'cozy');
    set('app-content-width', 'standard');
  });

  for (const route of ROUTES) {
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 160)));
    // Keep the audit offline-deterministic: third-party prayer/weather calls
    // are not what we are measuring, and a 30s network wait is noise.
    await page.route('**/*', (requestRoute) => {
      const url = new URL(requestRoute.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        return requestRoute.continue();
      }
      return requestRoute.abort();
    });

    const row = { route, viewport: viewport.name, ok: true };
    try {
      const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(900);
      row.status = response ? response.status() : 0;
      row.overflow = await page.evaluate(() => {
        const element = document.documentElement;
        return element.scrollWidth - element.clientWidth;
      });
      row.errorFallback = await page
        .locator('text=حدث خطأ غير متوقع')
        .count()
        .then((count) => count > 0);
      row.h1 = await page
        .locator('h1')
        .first()
        .textContent()
        .then((text) => (text ?? '').trim().slice(0, 80))
        .catch(() => '');
      row.h1Count = await page.locator('h1').count();
      // RTL integrity: an element whose computed direction is ltr without a
      // local dir="ltr" (or a code/input context) is a mixed-direction leak.
      row.dirLeaks = await page.evaluate(() => {
        const allowed = new Set(['INPUT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'SAMP']);
        let leaks = 0;
        for (const element of document.querySelectorAll('body *')) {
          if (element.closest('[dir="ltr"]') || element.closest('[dir="auto"]')) continue;
          if (allowed.has(element.tagName)) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width < 4 || rect.height < 4) continue;
          if (getComputedStyle(element).direction === 'ltr') leaks += 1;
        }
        return leaks;
      });
      // Touch targets: interactive elements below the 44px floor at 390px.
      row.smallTargets = viewport.name === '390x844'
        ? await page.evaluate(() => {
            const nodes = document.querySelectorAll('a[href], button:not([disabled]), [role="button"]:not([aria-disabled="true"])');
            let small = 0;
            for (const element of nodes) {
              const rect = element.getBoundingClientRect();
              if (rect.width < 2 || rect.height < 2) continue;
              if (getComputedStyle(element).visibility === 'hidden') continue;
              if (rect.width < 44 || rect.height < 44) small += 1;
            }
            return small;
          })
        : 0;
      row.pageErrors = pageErrors;
      row.ok = row.status === 200 && row.overflow <= 1 && !row.errorFallback && row.h1Count >= 1;
      if (viewport.name === '390x844' && row.ok) {
        const slug = route === '/' ? 'root' : route.replace(/^\/+|\/+$/g, '').replaceAll('/', '_');
        fs.mkdirSync(SHOTS, { recursive: true });
        row.shot = path.join(SHOTS, slug + '.png');
        await page.screenshot({ path: row.shot, animations: 'disabled' });
      }
    } catch (error) {
      row.ok = false;
      row.error = String(error).split('\n')[0].slice(0, 200);
    }
    await page.close();
    report.push(row);
    if (!row.ok) {
      console.log('FAIL ' + viewport.name + ' ' + route + ' → ' + JSON.stringify({
        status: row.status ?? row.error,
        overflow: row.overflow,
        errorFallback: row.errorFallback,
        h1: row.h1,
        h1Count: row.h1Count,
        dirLeaks: row.dirLeaks,
        smallTargets: row.smallTargets,
        pageErrors: row.pageErrors,
      }));
    }
  }
  await context.close();
}

await browser.close();

const outFile = path.resolve(ROOT, 'verification/design/route-audit.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));

const failures = report.filter((row) => !row.ok);
console.log(JSON.stringify({
  routes: ROUTES.length,
  checks: report.length,
  failed: failures.length,
  shots: SHOTS,
  report: path.relative(ROOT, outFile),
}, null, 2));
process.exit(failures.length > 0 ? 1 : 0);
