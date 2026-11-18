import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = 'verification/design/qa/baseline/p0';
fs.mkdirSync(OUT, { recursive: true });
const PROFILE = {
  'app-theme': 'dark', 'app-color-theme': 'expressive', 'app-palette-style': 'tonal',
  'app-black-mode': 'false', 'app-surface-lift': 'subtle', 'app-ui-density': 'cozy',
  'app-content-width': 'standard', 'app-reduced-motion': 'true',
};

async function inspect(browser, path, width, height, label) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, locale: 'ar',
    timezoneId: 'Asia/Riyadh', reducedMotion: 'reduce', colorScheme: 'dark',
  });
  await context.addInitScript((profile) => {
    for (const [k, v] of Object.entries(profile)) localStorage.setItem(k, v);
  }, PROFILE);
  const page = await context.newPage();
  await page.route('**/*', (r) => {
    const host = new URL(r.request().url()).hostname;
    if (host === '127.0.0.1' || host === 'localhost' || host.endsWith('googleapis.com') || host.endsWith('gstatic.com')) return r.continue();
    return r.abort();
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.goto('http://127.0.0.1:5199' + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  const data = await page.evaluate(() => {
    const kbOpen = document.documentElement.hasAttribute('data-soft-keyboard-open');
    const kbPanel = document.querySelector('[data-soft-keyboard-panel]');
    const active = document.activeElement;
    const rect = (el) => (el ? (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; })() : null);
    const desc = (el) => (el ? el.tagName.toLowerCase() + (el.getAttribute('type') ? '[type=' + el.getAttribute('type') + ']' : '') + (el.getAttribute('aria-label') ? '{' + el.getAttribute('aria-label') + '}' : '') + (el.textContent ? ' "' + el.textContent.trim().slice(0, 28) + '"' : '') : null);
    const password = document.querySelector('input[type=password]');
    const submit = [...document.querySelectorAll('button, [role=button], input[type=submit]')].find((b) => /تسجيل الدخول|دخول|Login|Sign in/i.test((b.textContent || '') + (b.getAttribute('aria-label') || '')) && b.offsetParent !== null) || null;
    let kbBox = null;
    if (kbPanel) {
      const inner = [...kbPanel.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().height > 120 && el.getBoundingClientRect().width > 200);
      const el = inner.length ? inner[inner.length - 1] : null;
      kbBox = rect(el || kbPanel);
    }
    let submitCovered = null;
    if (submit) {
      const r = submit.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      submitCovered = top ? { topElement: desc(top), insideKeyboard: !!top.closest('[data-soft-keyboard-panel]') } : null;
    }
    const vh = window.innerHeight;
    const clipped = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { visible: r.top >= 0 && r.bottom <= vh, top: Math.round(r.top), bottom: Math.round(r.bottom), vh }; };
    return {
      url: location.pathname, title: document.title, viewport: { w: innerWidth, h: vh },
      softKeyboardOpen: kbOpen, activeElement: desc(active), activeRect: rect(active),
      keyboardRect: kbBox, keyboardHeightVar: getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),
      username: rect(document.querySelector('input[name=username], input[autocomplete=username], input[type=text]')),
      password: rect(password), submit: rect(submit), submitText: desc(submit),
      submitVisibility: clipped(submit), passwordVisibility: clipped(password), submitCovered,
      bodyOverflow: getComputedStyle(document.body).overflow, htmlData: { kb: document.documentElement.getAttribute('data-soft-keyboard-open') },
      h1Count: document.querySelectorAll('h1').length, h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()).slice(0, 2),
      dialogCount: document.querySelectorAll('[role=dialog], [aria-modal=true]').length,
    };
  });
  await page.screenshot({ path: OUT + '/' + label + '-viewport.png', animations: 'disabled' });
  // Escape behaviour
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  const afterEsc = await page.evaluate(() => ({
    softKeyboardOpen: document.documentElement.hasAttribute('data-soft-keyboard-open'),
    activeElement: document.activeElement ? document.activeElement.tagName.toLowerCase() + (document.activeElement.getAttribute('type') ? '[' + document.activeElement.getAttribute('type') + ']' : '') : null,
    kbHeight: getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),
  }));
  await page.screenshot({ path: OUT + '/' + label + '-after-escape.png', animations: 'disabled' });
  console.log(JSON.stringify({ label, path, data, afterEsc, pageErrors: errors.slice(0, 3) }));
  await context.close();
}

const browser = await chromium.launch();
await inspect(browser, '/auth', 390, 844, 'auth-390');
await inspect(browser, '/profile', 390, 844, 'profile-390');
await inspect(browser, '/auth', 1440, 900, 'auth-1440');
await browser.close();
