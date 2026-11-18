import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar' });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5199/settings/keyboard', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.evaluate(() => {
  window.__kbStack = [];
  const orig = window.dispatchEvent.bind(window);
  window.dispatchEvent = (e) => {
    if (e && e.type === 'soft-keyboard:request-open') {
      window.__kbStack.push({ t: Math.round(performance.now()), stack: String(new Error().stack).split('\n').slice(1, 9).join(' | ') });
    }
    return orig(e);
  };
});
await p.getByRole('button', { name: 'فتح لوحة المفاتيح للتجربة' }).click();
await p.waitForTimeout(700);
// Click close by evaluating the button's own click() to avoid pointer interception ambiguity
const before = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') || '').includes('لوحة المفاتيح'));
  return btns.map(b => ({ label: b.getAttribute('aria-label'), rect: (() => { const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() }));
});
console.log('BUTTONS AFTER OPEN', JSON.stringify(before));
const closeInfo = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'إغلاق لوحة المفاتيح');
  if (!btn) return { found: false };
  const top = document.elementFromPoint(btn.getBoundingClientRect().x + 22, btn.getBoundingClientRect().y + 22);
  return { found: true, hit: top ? (top.tagName + '.' + String(top.className).slice(0, 50)) + ' aria=' + top.getAttribute('aria-label') : null };
});
console.log('HIT TEST', JSON.stringify(closeInfo));
await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'إغلاق لوحة المفاتيح');
  btn.click();
});
await p.waitForTimeout(1500);
const after = await p.evaluate(() => ({
  openAttr: document.documentElement.getAttribute('data-soft-keyboard-open'),
  heightVar: document.documentElement.style.getPropertyValue('--soft-keyboard-height'),
  stack: window.__kbStack,
  labels: [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') || '').includes('لوحة المفاتيح')).map(b => b.getAttribute('aria-label') + '/' + b.getAttribute('aria-pressed')),
}));
console.log('AFTER PROGRAMMATIC CLOSE', JSON.stringify(after, null, 1));
await b.close();
