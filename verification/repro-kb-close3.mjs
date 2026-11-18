import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar' });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5199/settings/keyboard', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.evaluate(() => {
  window.__trace = [];
  const orig = window.dispatchEvent.bind(window);
  window.dispatchEvent = (e) => {
    if (e && typeof e.type === 'string' && (e.type === 'soft-keyboard:request-open' || e.type === 'soft-keyboard:request-close')) {
      window.__trace.push({ type: e.type, t: Math.round(performance.now()), stack: String(new Error().stack).split('\n').slice(2, 6).join(' | ') });
    }
    return orig(e);
  };
  document.addEventListener('click', (ev) => {
    window.__trace.push({ type: 'click', t: Math.round(performance.now()), target: (ev.target && ev.target.tagName) + ':' + ((ev.target && ev.target.getAttribute && ev.target.getAttribute('aria-label')) || (ev.target.textContent || '').slice(0, 12)) });
  }, true);
});
await p.getByRole('button', { name: 'فتح لوحة المفاتيح للتجربة' }).click();
await p.waitForTimeout(700);
await p.getByRole('button', { name: 'إغلاق لوحة المفاتيح' }).click();
await p.waitForTimeout(1500);
const trace = await p.evaluate(() => ({ trace: window.__trace, openAttr: document.documentElement.getAttribute('data-soft-keyboard-open'), height: document.documentElement.style.getPropertyValue('--soft-keyboard-height') }));
console.log(JSON.stringify(trace, null, 1));
await b.close();
