#!/usr/bin/env node
/**
 * Rendered contrast audit.
 *
 * The theme engine proves its token pairs clear WCAG, but that is not the same
 * as the rendered page: a label can sit on a tinted container, a translucent
 * overlay or a data wash. This script walks the actual DOM of representative
 * routes in both modes, composites each text colour over its real ancestor
 * background stack, and reports text below WCAG AA (4.5:1, or 3:1 for large
 * text). It is evidence, not a substitute for human judgement.
 *
 *   node scripts/check-contrast.mjs
 *   node scripts/check-contrast.mjs --routes /,/mihrab --modes dark,light
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BASE = process.env.AUDIT_BASE ?? 'http://127.0.0.1:4173';
const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf('--' + name);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

const ROUTES = arg(
  'routes',
  '/,/mihrab,/weather,/settings/appearance,/fitness,/crypto,/wellness,/time-ledger,/travel-atlas,/diwan,/reading,/german-club,/games/chess,/chat,/archive,/pkm,/journal,/knowledge,/podcasts,/profile',
).split(',').filter(Boolean);
const MODES = arg('modes', 'dark,light').split(',').filter(Boolean);

function auditPage() {
  const parse = (value) => {
    const match = value && value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const lum = (color) => {
    const channel = (value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  };
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const backgroundOf = (element) => {
    const stack = [];
    // A painted sibling (an absolutely positioned active-state layer under the
    // label) is the real background for the text, but it is not an ancestor.
    // Without this the active tab measured its label against the page and
    // produced a false 1.4:1. Look for such a layer before walking up.
    let ancestor = element.parentElement;
    for (let depth = 0; depth < 3 && ancestor; depth += 1) {
      for (const sibling of ancestor.children) {
        if (sibling === element || sibling.contains(element) || element.contains(sibling)) continue;
        const style = getComputedStyle(sibling);
        const isLayer = style.position === 'absolute' || style.position === 'fixed';
        if (!isLayer) continue;
        const parsed = parse(style.backgroundColor);
        if (!parsed || parsed.a <= 0.9) continue;
        const box = sibling.getBoundingClientRect();
        const parentBox = ancestor.getBoundingClientRect();
        if (box.width >= parentBox.width * 0.55 && box.height >= parentBox.height * 0.55) {
          stack.push(parsed);
          break;
        }
      }
      if (stack.length > 0) break;
      ancestor = ancestor.parentElement;
    }
    // A photo/video/canvas behind the text cannot be measured from computed
    // style; skip instead of inventing a background.
    if (element.closest('picture, video, canvas, [data-photo]')) return null;
    let mediaOwner = element.parentElement;
    for (let depth = 0; depth < 3 && mediaOwner; depth += 1) {
      const media = mediaOwner.querySelector('img, canvas, video, picture');
      if (media) {
        const mediaBox = media.getBoundingClientRect();
        const ownerBox = mediaOwner.getBoundingClientRect();
        if (mediaBox.width >= ownerBox.width * 0.5 && mediaBox.height >= ownerBox.height * 0.5) return null;
      }
      mediaOwner = mediaOwner.parentElement;
    }
    let node = element;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') {
        // Keep a painted sibling result if we already have one; otherwise the
        // real background is unmeasured.
        if (stack.length === 0) return null;
        break;
      }
      const parsed = parse(style.backgroundColor);
      if (parsed && parsed.a > 0) {
        stack.push(parsed);
        if (parsed.a >= 0.999) break;
      }
      node = node.parentElement;
    }
    let color = { r: 0, g: 0, b: 0, a: 1 };
    if (stack.length === 0) {
      const body = parse(getComputedStyle(document.body).backgroundColor);
      color = body && body.a > 0 ? body : { r: 20, g: 20, b: 20, a: 1 };
    } else {
      for (let i = stack.length - 1; i >= 0; i -= 1) color = over(stack[i], color);
    }
    return color;
  };
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.2;
  };

  const findings = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text.length < 2) continue;
    const element = node.parentElement;
    if (!element || seen.has(element) || !visible(element)) continue;
    seen.add(element);
    if (element.closest('[aria-hidden="true"], .sr-only, svg, canvas, script, style')) continue;
    const style = getComputedStyle(element);
    const fg = parse(style.color);
    const bg = backgroundOf(element);
    if (!fg || !bg) continue;
    const foreground = fg.a < 1 ? over(fg, bg) : fg;
    const size = Number.parseFloat(style.fontSize);
    const weight = Number.parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const minimum = large ? 3 : 4.5;
    const value = ratio(foreground, bg);
    if (value + 0.01 < minimum) {
      const identity = element.tagName.toLowerCase() + (element.className && typeof element.className === 'string' ? '.' + element.className.split(/\s+/).slice(0, 2).join('.') : '');
      findings.push({
        ratio: Number(value.toFixed(2)),
        minimum,
        size: Math.round(size * 10) / 10,
        weight,
        text: text.slice(0, 40),
        element: identity.slice(0, 70),
      });
    }
  }
  return findings;
}

const browser = await chromium.launch();
const results = [];

for (const mode of MODES) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    reducedMotion: 'reduce',
    colorScheme: mode,
  });
  await context.addInitScript((selectedMode) => {
    const set = (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* blocked */
      }
    };
    set('app-theme', selectedMode);
    set('app-color-theme', 'expressive');
    set('app-palette-style', 'tonal');
    set('app-black-mode', 'false');
    set('app-surface-lift', 'subtle');
    set('app-ui-density', 'cozy');
    set('app-content-width', 'standard');
  }, mode);

  for (const route of ROUTES) {
    const page = await context.newPage();
    await page.route('**/*', (requestRoute) => {
      const url = new URL(requestRoute.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return requestRoute.continue();
      return requestRoute.abort();
    });
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(800);
      const findings = await page.evaluate(auditPage);
      // De-duplicate identical text/colour pairs that repeat in lists.
      const unique = [];
      const seen = new Set();
      for (const finding of findings) {
        const key = finding.element + '|' + finding.ratio + '|' + finding.minimum;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(finding);
      }
      if (unique.length > 0) {
        results.push({ route, mode, findings: unique.slice(0, 12) });
        console.log('CONTRAST ' + mode + ' ' + route + ' → ' + unique.length + ' below AA');
      }
    } catch (error) {
      results.push({ route, mode, error: String(error).split('\n')[0] });
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
const outFile = path.resolve(import.meta.dirname, '../verification/design/contrast-audit.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log(JSON.stringify({ routes: ROUTES.length, modes: MODES.length, flagged: results.length }, null, 2));
