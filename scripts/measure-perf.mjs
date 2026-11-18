#!/usr/bin/env node
/**
 * Field-style performance probe for representative routes.
 *
 * Measures, in Chromium against the production preview:
 *   - navigation timing (TTFB, DOMContentLoaded)
 *   - LCP (buffered PerformanceObserver)
 *   - CLS (layout-shift entries without recent input)
 *   - long tasks (>50ms) count and total
 *   - JS transfer size for the route's document+chunks
 *
 * It is a regression signal for the visual campaign, not a lab benchmark:
 * same machine, same viewport, cold context per route, reduced motion.
 *
 *   node scripts/measure-perf.mjs
 *   node scripts/measure-perf.mjs --base http://127.0.0.1:4173 --out verification/reports/perf.json
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const BASE = arg('base', 'http://127.0.0.1:4173');
const OUT = path.resolve(arg('out', 'verification/reports/perf.json'));
const ROUTES = arg('routes', '/,/mihrab,/weather,/chat,/games/chess,/settings/appearance,/travel-atlas,/reading,/crypto,/journal').split(',').filter(Boolean);
const VIEWPORT = arg('viewport', '390x844').split('x').map(Number);

const browser = await chromium.launch();
const rows = [];

for (const route of ROUTES) {
  const context = await browser.newContext({
    viewport: { width: VIEWPORT[0], height: VIEWPORT[1] },
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('app-theme', 'dark');
      localStorage.setItem('app-color-theme', 'expressive');
      localStorage.setItem('app-reduced-motion', 'true');
      window.__perf = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__perf.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__perf.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perf.longTasks += 1;
          window.__perf.longTaskMs += entry.duration;
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      /* storage blocked */
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  const row = { route };
  try {
    const t0 = Date.now();
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 60_000 });
    row.loadMs = Date.now() - t0;
    await page.waitForTimeout(2500);
    const data = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      let transfer = 0;
      let jsBytes = 0;
      for (const r of resources) {
        transfer += r.transferSize || 0;
        if ((r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)) && r.name.includes(location.origin)) {
          jsBytes += r.transferSize || 0;
        }
      }
      return {
        ttfb: nav ? Math.round(nav.responseStart) : null,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        lcp: Math.round(window.__perf.lcp),
        cls: Number(window.__perf.cls.toFixed(4)),
        longTasks: window.__perf.longTasks,
        longTaskMs: Math.round(window.__perf.longTaskMs),
        jsTransferKb: Math.round(jsBytes / 1024),
        totalTransferKb: Math.round(transfer / 1024),
      };
    });
    Object.assign(row, data);
    row.pageErrors = errors;
  } catch (error) {
    row.error = String(error).split('\n')[0].slice(0, 200);
  }
  await page.close();
  await context.close();
  rows.push(row);
  console.log(JSON.stringify(row));
}

await browser.close();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ measuredAt: new Date().toISOString(), base: BASE, viewport: VIEWPORT.join('x'), rows }, null, 1));
const bad = rows.filter((r) => r.error || (r.lcp ?? 0) > 4000 || r.pageErrors?.length);
console.log(JSON.stringify({ routes: rows.length, warnings: bad.length, out: OUT }, null, 2));
process.exit(bad.length ? 1 : 0);
