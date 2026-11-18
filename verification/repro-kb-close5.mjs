import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.goto('http://127.0.0.1:5199/settings/keyboard', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const snap = () => p.evaluate(() => {
  const panel = document.querySelector('[data-soft-keyboard-panel]');
  const kb = panel && panel.firstElementChild;
  const r = kb ? kb.getBoundingClientRect() : null;
  const toggle = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '').includes('لوحة المفاتيح') && x.closest('.app-card'));
  const tr = toggle ? toggle.getBoundingClientRect() : null;
  return {
    openAttr: document.documentElement.getAttribute('data-soft-keyboard-open'),
    height: document.documentElement.style.getPropertyValue('--soft-keyboard-height'),
    panelMounted: Boolean(kb), kbRect: r ? { top: Math.round(r.top), h: Math.round(r.height) } : null,
    toggle: toggle ? { label: toggle.getAttribute('aria-label'), pressed: toggle.getAttribute('aria-pressed'), rect: tr ? { y: Math.round(tr.y), h: Math.round(tr.h) } : null, position: getComputedStyle(toggle).position } : null,
  };
});
const openBtn = p.getByRole('button', { name: 'فتح لوحة المفاتيح للتجربة' });
await openBtn.click();
await p.waitForTimeout(800);
console.log('1 OPEN', JSON.stringify(await snap()));
const closeBtn = p.getByRole('button', { name: 'إغلاق لوحة المفاتيح' });
await closeBtn.click();
await p.waitForTimeout(1200);
console.log('2 CLOSE', JSON.stringify(await snap()));
await p.waitForTimeout(300);
await p.getByRole('button', { name: 'فتح لوحة المفاتيح للتجربة' }).click();
await p.waitForTimeout(800);
console.log('3 REOPEN', JSON.stringify(await snap()));
await p.getByRole('button', { name: 'إغلاق لوحة المفاتيح' }).click();
await p.waitForTimeout(1000);
console.log('4 CLOSE AGAIN', JSON.stringify(await snap()));
console.log('ERRORS', JSON.stringify(errs));
await b.close();
