import { chromium } from '@playwright/test';
import fs from 'node:fs';
const out = 'verification/design/qa/f-fix-keyboard';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar', reducedMotion: 'reduce', colorScheme: 'dark' });
await ctx.addInitScript(() => {
  localStorage.setItem('app-theme', 'dark');
  localStorage.setItem('app-color-theme', 'expressive');
});
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5199/settings/keyboard', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.getByRole('button', { name: 'فتح لوحة المفاتيح للتجربة' }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: out + '/1-open.png' });
await p.getByRole('button', { name: 'إغلاق لوحة المفاتيح' }).click();
await p.waitForTimeout(1200);
await p.screenshot({ path: out + '/2-after-close.png' });
const state = await p.evaluate(() => ({
  openAttr: document.documentElement.getAttribute('data-soft-keyboard-open'),
  height: document.documentElement.style.getPropertyValue('--soft-keyboard-height'),
  panelMounted: Boolean(document.querySelector('[data-soft-keyboard-panel]')?.firstElementChild),
  toggleLabel: [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '').includes('لوحة المفاتيح') && x.closest('.app-card'))?.getAttribute('aria-label'),
}));
console.log(JSON.stringify(state));
await p.getByRole('button', { name: 'فتح لوحة المفاتيح للتجربة' }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: out + '/3-reopen.png' });
await b.close();
