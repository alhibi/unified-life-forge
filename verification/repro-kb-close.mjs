import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar' });
const p = await ctx.newPage();
const logs = [];
p.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 200)));
p.on('pageerror', e => logs.push('PAGEERROR: ' + String(e).slice(0, 300)));
await p.goto('http://127.0.0.1:5199/settings/keyboard', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.evaluate(() => {
  window.__kbEvents = [];
  const orig = window.dispatchEvent.bind(window);
  window.dispatchEvent = (e) => {
    if (e && typeof e.type === 'string' && e.type.indexOf('soft-keyboard') === 0) {
      try { window.__kbEvents.push({ type: e.type, detail: e.detail ? JSON.stringify(e.detail) : null, t: Math.round(performance.now()) }); } catch { window.__kbEvents.push({ type: e.type }); }
    }
    return orig(e);
  };
});
const snap = () => p.evaluate(() => {
  const panel = document.querySelector('[data-soft-keyboard-panel]');
  const kb = panel && panel.firstElementChild;
  const r = kb ? kb.getBoundingClientRect() : null;
  return {
    openAttr: document.documentElement.getAttribute('data-soft-keyboard-open'),
    heightVar: document.documentElement.style.getPropertyValue('--soft-keyboard-height'),
    panelChildren: panel ? panel.children.length : -1,
    kbRect: r ? { top: Math.round(r.top), height: Math.round(r.height) } : null,
    toggles: [...document.querySelectorAll('button[aria-label*="لوحة المفاتيح"]')].map(b => ({ label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed') })),
    events: window.__kbEvents,
  };
});
const open = p.getByRole('button', { name: 'فتح لوحة المفاتيح للتجربة' });
await open.click();
await p.waitForTimeout(800);
console.log('AFTER OPEN', JSON.stringify(await snap(), null, 1));
const close = p.getByRole('button', { name: 'إغلاق لوحة المفاتيح' });
await close.click();
await p.waitForTimeout(2000);
console.log('AFTER CLOSE', JSON.stringify(await snap(), null, 1));
console.log('LOGS', JSON.stringify(logs.slice(0, 10), null, 1));
await b.close();
