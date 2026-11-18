import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar' });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5199/settings/keyboard', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const data = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('button[role="switch"], [role="switch"], button')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height) out.push({ role: el.getAttribute('role'), cls: (el.className || '').toString().slice(0, 110), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), label: el.getAttribute('aria-label') });
  }
  return out.slice(0, 16);
});
console.log(JSON.stringify(data, null, 1));
await b.close();
