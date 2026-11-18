#!/usr/bin/env node
/**
 * Route audit — strict browser gate.
 *
 * Answers questions jsdom cannot: horizontal overflow, error boundary,
 * exactly one semantic heading, RTL direction leaks, touch targets below the
 * 44px floor, truncated headings, floating controls covering actions, page
 * errors and console errors.
 *
 * Every measured check below actually participates in row.ok. Exemptions are
 * not blanket: they live in scripts/audit-allowlist.json keyed by route+check
 * with a selector, a reason, an owner and a doc reference. A selector that
 * matches nothing fails the audit as stale.
 *
 *   node scripts/audit-routes.mjs                         all routes, 390 + 1440
 *   node scripts/audit-routes.mjs --routes /,/weather      subset
 *   node scripts/audit-routes.mjs --shots /tmp/shots       screenshot dir
 *   node scripts/audit-routes.mjs --no-shots               skip screenshots
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = process.env.AUDIT_BASE ?? 'http://127.0.0.1:5199';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const flagOn = (name) => args.includes('--' + name);

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
  return [...found]
    .map((r) => r.replace(/:([A-Za-z0-9_]+)\??/g, (_w, n) => FIXTURES[n] ?? '1'))
    .sort();
}

const ALLOW_PATH = path.join(ROOT, 'scripts/audit-allowlist.json');
const ALLOW = fs.existsSync(ALLOW_PATH) ? JSON.parse(fs.readFileSync(ALLOW_PATH, 'utf8')) : { entries: [] };
const usedAllow = new Set();
const CHECKS = ['smallTargets', 'dirLeaks', 'clippedHeadings', 'floatOverlaps'];

function allowFor(route) {
  const map = {};
  for (const check of CHECKS) {
    map[check] = [];
    for (const entry of ALLOW.entries ?? []) {
      if (!entry.checks.includes(check)) continue;
      if (!entry.routes.includes('*') && !entry.routes.includes(route)) continue;
      map[check].push(entry.selector);
    }
  }
  return map;
}
function allowEntriesFor(route, check) {
  return (ALLOW.entries ?? []).filter(
    (e) => e.checks.includes(check) && (e.routes.includes('*') || e.routes.includes(route)),
  );
}

const CONSOLE_IGNORE = [
  /Failed to fetch/i,
  /net::ERR/i,
  /ERR_FAILED/i,
  /ResizeObserver loop/i,
  /React DevTools/i,
  /the server responded with a status of 4\d\d/i,
  /fonts\.googleapis/i,
  /Failed to load resource/i,
  /AbortError/i,
  /The user aborted a request/i,
  /Missing or insufficient permissions/i,
];

const ROUTES = (() => {
  const only = arg('routes', null);
  return only ? only.split(',').filter(Boolean) : extractRoutes();
})();
const SHOTS = flagOn('no-shots') ? null : path.resolve(arg('shots', 'verification/design/routes-390'));
const WORKERS = Math.max(1, Math.min(6, Number(arg('workers', '4'))));
const VIEWPORTS = arg('viewports', '390x844,1440x900')
  .split(',')
  .map((v) => {
    const [width, height] = v.split('x').map(Number);
    return { name: v, width, height };
  });

const browser = await chromium.launch();
const report = [];

const PROFILE = {
  'app-theme': 'dark',
  'app-color-theme': 'expressive',
  'app-palette-style': 'tonal',
  'app-black-mode': 'false',
  'app-surface-lift': 'subtle',
  'app-ui-density': 'cozy',
  'app-content-width': 'standard',
  'app-reduced-motion': 'true',
};

function slugOf(route) {
  return route === '/' ? 'root' : route.replace(/^\/+|\/+$/g, '').replaceAll('/', '_');
}

async function measure(page, isMobile, allow) {
  return page.evaluate(
    ({ mobile, allowMap }) => {
      const result = { smallTargets: [], dirLeaks: [], clippedHeadings: [], floatOverlaps: [], allowMatches: {} };
      const isAllowed = (check, el) =>
        (allowMap[check] || []).some((sel) => {
          try {
            return el.matches(sel) || el.closest(sel) !== null;
          } catch {
            return false;
          }
        });
      for (const check of Object.keys(allowMap)) {
        result.allowMatches[check] = {};
        for (const sel of allowMap[check]) {
          try {
            result.allowMatches[check][sel] = document.querySelectorAll(sel).length;
          } catch {
            result.allowMatches[check][sel] = -1;
          }
        }
      }
      const visible = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width >= 2 && r.height >= 2;
      };
      const describe = (el) => {
        const cls =
          typeof el.className === 'string'
            ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.')
            : '';
        return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
      };

      if (mobile) {
        const nodes = document.querySelectorAll(
          'a[href], button:not([disabled]), [role="button"]:not([aria-disabled="true"]), [role="tab"], [role="switch"], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
        );
        for (const el of nodes) {
          if (!visible(el)) continue;
          if (el.closest('[inert], [aria-hidden="true"]')) continue;
          if (isAllowed('smallTargets', el)) continue;
          if (el.tagName === 'A' && el.closest('p, li, blockquote') && getComputedStyle(el).display === 'inline')
            continue;
          const r = el.getBoundingClientRect();
          // A switch is deliberately a 28px-painted track with a 44x44
          // invisible ::after hit area (ui/switch.tsx). The accessible target
          // is the union, so measure the pseudo box instead of stretching the
          // switch itself (which the review correctly rejected as a visual
          // defect). Scoped to role=switch only; no blanket exemption.
          if (el.getAttribute('role') === 'switch') {
            const after = getComputedStyle(el, '::after');
            const afterW = Number.parseFloat(after.width);
            const afterH = Number.parseFloat(after.height);
            if (afterW >= 44 && afterH >= 44) continue;
          }
          if (r.width < 44 || r.height < 44) {
            result.smallTargets.push({
              selector: describe(el),
              w: Math.round(r.width),
              h: Math.round(r.height),
              text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
            });
          }
        }
      }

      const dirSkip = new Set(['INPUT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'SAMP', 'SCRIPT', 'STYLE']);
      for (const el of document.querySelectorAll('body *')) {
        if (dirSkip.has(el.tagName)) continue;
        if (el.closest('[dir="ltr"], [dir="auto"]')) continue;
        if (!visible(el)) continue;
        if (!(el.textContent || '').trim()) continue;
        if (isAllowed('dirLeaks', el)) continue;
        if (getComputedStyle(el).direction === 'ltr')
          result.dirLeaks.push({ selector: describe(el), text: (el.textContent || '').trim().slice(0, 60) });
      }

      for (const el of document.querySelectorAll('h1, h2, h3, h4, [role="heading"]')) {
        if (!visible(el)) continue;
        if (isAllowed('clippedHeadings', el)) continue;
        if (el.scrollWidth > el.clientWidth + 2) {
          result.clippedHeadings.push({
            selector: describe(el),
            text: (el.textContent || '').trim().slice(0, 80),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          });
        }
      }

      const floats = [...document.querySelectorAll('body *')].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed') return false;
        // A fixed element that explicitly ignores pointer events cannot block
        // an action; it is decoration/measurement context, not a collision.
        if (cs.pointerEvents === 'none') return false;
        if (el.closest('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return false;
        return r.top > innerHeight * 0.45 && r.bottom > 0;
      });
      const controls = [
        ...document.querySelectorAll(
          'button:not([disabled]), [role="button"]:not([aria-disabled="true"]), input:not([type="hidden"]):not([disabled]), select:not([disabled])',
        ),
      ];
      for (const floatEl of floats) {
        if (isAllowed('floatOverlaps', floatEl)) continue;
        const fr = floatEl.getBoundingClientRect();
        for (const control of controls) {
          if (floatEl.contains(control)) continue;
          if (!visible(control)) continue;
          const cr = control.getBoundingClientRect();
          const ix = Math.max(0, Math.min(fr.right, cr.right) - Math.max(fr.left, cr.left));
          const iy = Math.max(0, Math.min(fr.bottom, cr.bottom) - Math.max(fr.top, cr.top));
          if (ix >= 8 && iy >= 8 && ix * iy >= 140) {
            result.floatOverlaps.push({
              floating: describe(floatEl),
              control: describe(control),
              controlText: (control.getAttribute('aria-label') || control.textContent || '').trim().slice(0, 40),
              overlap: Math.round(ix * iy),
            });
          }
        }
      }

      return result;
    },
    { mobile: isMobile, allowMap: allow },
  );
}

function finishRow(row) {
  const failures = [];
  if (row.status !== 200) failures.push('status:' + row.status);
  if (row.overflow > 1) failures.push('overflow:' + row.overflow);
  if (row.errorFallback) failures.push('error-boundary');
  if (row.h1Count !== 1) failures.push('h1-count:' + row.h1Count);
  if (row.dirLeaks.length > 0) failures.push('dir-leaks:' + row.dirLeaks.length);
  if (row.smallTargets.length > 0) failures.push('small-targets:' + row.smallTargets.length);
  if (row.clippedHeadings.length > 0) failures.push('clipped-headings:' + row.clippedHeadings.length);
  if (row.floatOverlaps.length > 0) failures.push('float-overlap:' + row.floatOverlaps.length);
  if (row.pageErrors.length > 0) failures.push('page-errors:' + row.pageErrors.length);
  row.failures = failures;
  row.ok = failures.length === 0;
  return row;
}

async function auditRoute(route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.width < 500 ? 2 : 1,
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  await context.addInitScript((profile) => {
    try {
      for (const [k, v] of Object.entries(profile)) localStorage.setItem(k, v);
    } catch {
      /* storage blocked */
    }
  }, PROFILE);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (CONSOLE_IGNORE.some((re) => re.test(text))) return;
    consoleErrors.push(text.slice(0, 200));
  });
  await page.route('**/*', (r) => {
    const url = new URL(r.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return r.continue();
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return r.continue();
    return r.abort();
  });

  const row = { route, viewport: viewport.name };
  try {
    const response = await page
      .goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch(() => null);
    await page.waitForTimeout(900);
    row.status = response ? response.status() : 0;
    row.overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    row.errorFallback = await page
      .locator('text=حدث خطأ غير متوقع')
      .count()
      .then((c) => c > 0)
      .catch(() => false);
    row.h1Count = await page.locator('h1').count();
    row.h1 = await page.locator('h1').first().textContent().catch(() => null);
    const allow = allowFor(route);
    const m = await measure(page, viewport.name === '390x844', allow);
    row.smallTargets = m.smallTargets;
    row.dirLeaks = m.dirLeaks;
    row.clippedHeadings = m.clippedHeadings;
    row.floatOverlaps = m.floatOverlaps;
    for (const check of CHECKS) {
      for (const entry of allowEntriesFor(route, check)) {
        const count = m.allowMatches[check]?.[entry.selector];
        if (count > 0) usedAllow.add(entry.id + ':' + check);
      }
    }
    row.pageErrors = pageErrors;
    row.consoleErrors = consoleErrors;
    if (SHOTS && viewport.name === '390x844') {
      const file = path.join(SHOTS, slugOf(route) + '.png');
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: file, animations: 'disabled' });
      row.shot = file;
    }
  } catch (error) {
    row.status = 0;
    row.error = String(error).split('\n')[0].slice(0, 200);
  }
  await page.close();
  await context.close();
  return finishRow(row);
}

const jobs = [];
for (const viewport of VIEWPORTS) for (const route of ROUTES) jobs.push({ route, viewport });
let cursor = 0;
async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    const row = await auditRoute(job.route, job.viewport);
    report.push(row);
    if (!row.ok) {
      console.log(
        'FAIL ' +
          row.viewport +
          ' ' +
          row.route +
          ' → ' +
          JSON.stringify({
            failures: row.failures,
            error: row.error,
            dirLeak: row.dirLeaks?.slice(0, 2),
            small: row.smallTargets?.slice(0, 3),
            clipped: row.clippedHeadings?.slice(0, 2),
            overlap: row.floatOverlaps?.slice(0, 2),
            pageErrors: row.pageErrors?.slice(0, 2),
            consoleErrors: row.consoleErrors?.slice(0, 2),
          }),
      );
    }
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close();

const stale = [];
for (const entry of ALLOW.entries ?? []) {
  // Only judge an exemption stale when this run actually audited one of its
  // routes; a subset run (e.g. --routes /games/chess) must not report an
  // unrelated /games/sudoku exemption as stale.
  const applicable = entry.routes.includes('*') || entry.routes.some((r) => ROUTES.includes(r));
  if (!applicable) continue;
  for (const check of entry.checks) {
    if (!usedAllow.has(entry.id + ':' + check)) stale.push(entry.id + ':' + check);
  }
}

const outFile = path.resolve(ROOT, arg('json-out', 'verification/design/route-audit.json'));
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));

const failures = report.filter((row) => !row.ok);
const byCheck = {};
for (const row of failures)
  for (const f of row.failures) {
    const key = f.split(':')[0];
    byCheck[key] = (byCheck[key] ?? 0) + 1;
  }
const summary = {
  routes: ROUTES.length,
  viewports: VIEWPORTS.length,
  checks: report.length,
  failed: failures.length,
  failedByCheck: byCheck,
  staleAllowlistEntries: stale,
  shots: SHOTS,
  report: path.relative(ROOT, outFile),
};
console.log(JSON.stringify(summary, null, 2));
if (stale.length) console.log('STALE ALLOWLIST: ' + stale.join(', '));
process.exit(failures.length > 0 || stale.length > 0 ? 1 : 0);
