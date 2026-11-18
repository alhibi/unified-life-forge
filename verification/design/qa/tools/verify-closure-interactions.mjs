import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { installAuthFixture, installSignedInRoutes, installAnonymousRoutes, readProjectRef, FIXTURE_USERNAME } from 'file:///Users/amer/ulf-design/scripts/lib/session-fixture.mjs';

const OUT = 'verification/design/qa/closure';
fs.mkdirSync(OUT + '/shots', { recursive: true });
const PROJECT_REF = readProjectRef('/Users/amer/ulf-design');
const browser = await chromium.launch();
const results = {};
const shot = (name) => OUT + '/shots/' + name + '.png';
async function mk({ signedIn = false, width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'ar', timezoneId: 'Asia/Riyadh', reducedMotion: 'reduce', colorScheme: 'dark' });
  if (signedIn) await installAuthFixture(ctx, { projectRef: PROJECT_REF, root: '/Users/amer/ulf-design' });
  const page = await ctx.newPage();
  if (signedIn) await installSignedInRoutes(page, PROJECT_REF); else await installAnonymousRoutes(page);
  return { ctx, page };
}
const textOf = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim());
const states = (page) => page.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert]')].map((s) => ({ role: s.getAttribute('role'), title: (s.querySelector('h3')?.textContent || '').trim().slice(0, 80), body: (s.querySelector('p')?.textContent || '').trim().slice(0, 120) })));

// ---------- 1. Signed-in fixture spot checks ----------
results.signedIn = {};
for (const [route, key] of [['/profile', 'profile'], ['/journal', 'journal'], ['/chat', 'chat']]) {
  try {
    const { ctx, page } = await mk({ signedIn: true });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    await page.goto('http://127.0.0.1:5199' + route, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);
    const txt = await textOf(page);
    const data = await page.evaluate(({ username }) => {
      const users = [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && (el.textContent || '').trim() === username);
      return {
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
        hasUsername: users.length > 0,
        usernameTags: users.slice(0, 3).map((el) => ({ tag: el.tagName.toLowerCase(), rect: (() => { const r = el.getBoundingClientRect(); return { y: Math.round(r.y), w: Math.round(r.width) }; })() })),
        loginCta: /تسجيل الدخول/.test(document.body.innerText || ''),
        authLoading: /تحقق من الأمان/.test(document.body.innerText || ''),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, { username: FIXTURE_USERNAME });
    await page.screenshot({ path: shot('signedin-' + key), animations: 'disabled' });
    results.signedIn[key] = { route, ...data, states: await states(page), bodyPreview: txt.slice(0, 400), errors: errors.slice(0, 2) };
    await ctx.close();
  } catch (e) { results.signedIn[key] = { route, error: String(e).slice(0, 300) }; }
}

// ---------- 2. TripsPage drawer contract ----------
results.trips = {};
try {
  const { ctx, page } = await mk();
  await page.goto('http://127.0.0.1:5199/travel-atlas/trips', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  const opener = page.locator('header button[aria-label="رحلة جديدة"], button[aria-label="رحلة جديدة"]').first();
  const openerBox = await opener.boundingBox();
  await opener.click();
  await page.waitForTimeout(900);
  const dialogInfo = () => page.evaluate(() => {
    const d = document.querySelector('[role=dialog],[aria-modal=true]');
    const active = document.activeElement;
    return {
      dialog: !!d,
      dialogText: d ? (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) : null,
      activeId: active?.getAttribute('id') || null,
      activeTag: active?.tagName?.toLowerCase() || null,
      activeInsideDialog: !!(d && active && d.contains(active)),
      bodyOverflow: getComputedStyle(document.body).overflow,
      alert: (d?.querySelector('[role=alert]')?.textContent || '').trim() || null,
    };
  });
  const open = await dialogInfo();
  await page.screenshot({ path: shot('trips-drawer-open'), animations: 'disabled' });
  // B1: empty submit -> inline alert
  await page.locator('[role=dialog] button[type=submit], [aria-modal=true] button[type=submit]').first().click();
  await page.waitForTimeout(400);
  const emptyAlert = await dialogInfo();
  await page.screenshot({ path: shot('trips-empty-alert'), animations: 'disabled' });
  // B2: out-of-order dates -> inline alert
  await page.locator('#new-trip-title').fill('رحلة اختبار');
  await page.locator('#new-trip-start').fill('2026-12-10');
  await page.locator('#new-trip-end').fill('2026-12-01');
  await page.locator('[role=dialog] button[type=submit], [aria-modal=true] button[type=submit]').first().click();
  await page.waitForTimeout(500);
  const datesAlert = await dialogInfo();
  await page.screenshot({ path: shot('trips-dates-alert'), animations: 'disabled' });
  // C1: Escape -> closed, focus returns to opener
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const afterEsc = await dialogInfo();
  const focusOnOpenerEsc = await opener.evaluate((el) => el === document.activeElement).catch(() => false);
  // C2: reopen, cancel -> focus restored
  await opener.click();
  await page.waitForTimeout(800);
  await page.locator('[role=dialog] button', { hasText: 'إلغاء' }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  const afterCancel = await dialogInfo();
  const focusOnOpenerCancel = await opener.evaluate((el) => el === document.activeElement).catch(() => false);
  results.trips = { openerBox: openerBox ? { y: Math.round(openerBox.y), w: Math.round(openerBox.width), h: Math.round(openerBox.height) } : null, open, emptyAlert, datesAlert, afterEsc, focusOnOpenerEsc, afterCancel, focusOnOpenerCancel };
  await ctx.close();
} catch (e) { results.trips = { error: String(e).slice(0, 400) }; }

// ---------- 3a. Chess CTA @360x640 ----------
results.chess = {};
try {
  const { ctx, page } = await mk({ width: 360, height: 640 });
  await page.goto('http://127.0.0.1:5199/games/chess', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2200);
  results.chess = await page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
    const ctas = [...document.querySelectorAll('button')].filter((b) => /لعبة جديدة/.test(b.textContent || ''));
    const cta = ctas[0] || null;
    const boardCandidates = [...document.querySelectorAll('img, canvas, [class*=board], [class*=Board]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 200 && r.height > 200; });
    const board = boardCandidates[0] || null;
    return { vh: innerHeight, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cta: cta ? { text: cta.textContent.trim().slice(0, 20), rect: rect(cta) } : null, board: board ? { tag: board.tagName.toLowerCase(), cls: (typeof board.className === 'string' ? board.className : '').slice(0, 80), rect: rect(board) } : null, ctaAboveBoard: !!(cta && board && rect(cta).bottom <= rect(board).y + 2) };
  });
  await page.screenshot({ path: shot('chess-360-closure'), animations: 'disabled' });
  await ctx.close();
} catch (e) { results.chess = { error: String(e).slice(0, 300) }; }

// ---------- 3b. Mihrab tabpanel focus ring ----------
results.mihrab = {};
try {
  const { ctx, page } = await mk();
  await page.goto('http://127.0.0.1:5199/mihrab', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);
  let panelInfo = null;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(40);
    const isPanel = await page.evaluate(() => document.activeElement?.getAttribute('role') === 'tabpanel');
    if (isPanel) { panelInfo = await page.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el); return { tabindex: el.getAttribute('tabindex'), focusVisible: el.matches(':focus-visible'), outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow }; }); break; }
  }
  await page.screenshot({ path: shot('mihrab-tabpanel-focus-ring'), animations: 'disabled' });
  results.mihrab = { tabStopsUntilPanel: panelInfo ? true : false, panelInfo };
  await ctx.close();
} catch (e) { results.mihrab = { error: String(e).slice(0, 300) }; }

// ---------- 4. Fitness Simulation Console (dev 5199) ----------
results.fitness = {};
for (const signedIn of [false, true]) {
  try {
    const { ctx, page } = await mk({ signedIn });
    await page.goto('http://127.0.0.1:5199/fitness', { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2200);
    const txt = await textOf(page);
    results.fitness[signedIn ? 'signedIn' : 'anonymous'] = { hasConsole: /Simulation Console/.test(txt) || /لوحة التحكم والمحاكاة/.test(txt), h1: await page.evaluate(() => [...document.querySelectorAll('h1')].map((h) => h.textContent.trim())), bodyPreview: txt.slice(0, 200) };
    if (signedIn) await page.screenshot({ path: shot('fitness-signedin-390'), animations: 'disabled' });
    await ctx.close();
  } catch (e) { results.fitness[signedIn ? 'signedIn' : 'anonymous'] = { error: String(e).slice(0, 300) }; }
}

// ---------- 5. Podcasts offline state (blocked external, 7s) ----------
results.podcasts = {};
try {
  const { ctx, page } = await mk();
  await page.goto('http://127.0.0.1:5199/podcasts', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(7000);
  results.podcasts = await page.evaluate(() => ({
    states: [...document.querySelectorAll('[role=status],[role=alert]')].map((s) => ({ role: s.getAttribute('role'), title: (s.querySelector('h3')?.textContent || '').trim().slice(0, 80), retry: [...s.querySelectorAll('button')].map((b) => b.textContent.trim()).slice(0, 2) })),
    skeletons: document.querySelectorAll('[class*=skeleton],[class*=animate-pulse]').length,
    spinners: document.querySelectorAll('.animate-spin').length,
    hasLoadText: /جارٍ|يتم التحميل|يتم جلب/.test(document.body.innerText || ''),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
  }));
  await page.screenshot({ path: shot('podcasts-offline-7s'), animations: 'disabled' });
  await ctx.close();
} catch (e) { results.podcasts = { error: String(e).slice(0, 300) }; }

await browser.close();
fs.writeFileSync(OUT + '/interactions.json', JSON.stringify(results, null, 1));
console.log(JSON.stringify(results, null, 1));
