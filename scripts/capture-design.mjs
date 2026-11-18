#!/usr/bin/env node
/**
 * Design verification capture.
 *
 * Boots the built app, applies a stored appearance profile BEFORE first paint
 * (the same localStorage keys the app itself reads), and captures the viewport
 * for a route set across viewports, modes and theme families.
 *
 *   node scripts/capture-design.mjs --out verification/design/before
 *   node scripts/capture-design.mjs --out shots --routes /,/weather --themes copper,mono --modes dark
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const OUT = path.resolve(arg('out', 'verification/design/current'));
const BASE = arg('base', 'http://127.0.0.1:4173');
const ROUTES = arg(
  'routes',
  '/,/mihrab,/weather,/chat,/games/chess,/settings/appearance,/travel-atlas,/diwan,/reading,/german-club',
).split(',').filter(Boolean);
const THEMES = arg('themes', 'expressive').split(',').filter(Boolean);
const MODES = arg('modes', 'dark,light').split(',').filter(Boolean);
const VIEWPORTS = arg('viewports', '360x800,768x1024,1440x900')
  .split(',')
  .map((v) => {
    const [width, height] = v.split('x').map(Number);
    return { width, height, name: v };
  });

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let captured = 0;
const failures = [];

for (const viewport of VIEWPORTS) {
  for (const mode of MODES) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
        locale: 'ar',
        timezoneId: 'Asia/Riyadh',
        reducedMotion: 'reduce',
        colorScheme: mode,
      });
      await context.addInitScript(
        ({ theme, mode }) => {
          const set = (k, v) => {
            try {
              localStorage.setItem(k, v);
            } catch {
              /* storage disabled */
            }
          };
          set('app-theme', mode);
          set('app-color-theme', theme);
          set('app-palette-style', 'tonal');
          set('app-black-mode', 'false');
          set('app-surface-lift', 'subtle');
          set('app-ui-density', 'cozy');
          set('app-content-width', 'standard');
          set('app-reduced-motion', 'true');
        },
        { theme, mode },
      );
      const page = await context.newPage();
      for (const route of ROUTES) {
        const url = BASE + route;
        const slug =
          route === '/'
            ? 'root'
            : route.replace(/^\/+|\/+$/g, '').replaceAll('/', '_');
        const file = path.join(OUT, viewport.name, theme + '-' + mode, slug + '.png');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
          await page.evaluate(() => document.fonts?.ready);
          await page.waitForTimeout(450);
          await page.screenshot({ path: file, animations: 'disabled' });
          captured += 1;
        } catch (error) {
          failures.push(url + ' → ' + String(error).split('\n')[0]);
        }
      }
      await context.close();
    }
  }
}

await browser.close();
console.log(JSON.stringify({ captured, failures, out: OUT }, null, 2));
process.exit(failures.length > 60 ? 1 : 0);
