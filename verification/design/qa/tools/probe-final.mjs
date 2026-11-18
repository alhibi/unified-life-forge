import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = 'verification/design/qa/final';
fs.mkdirSync(OUT, { recursive: true });
const PROFILE = { 'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true' };
const results = [];
const evidence = (name) => OUT + '/shots/' + name + '.png';
fs.mkdirSync(OUT + '/shots', { recursive: true });

const browser = await chromium.launch();

async function mk(width, height, mode = 'dark') {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: width < 500 ? 2 : 1, locale: 'ar',
    timezoneId: 'Asia/Riyadh', reducedMotion: 'reduce', colorScheme: mode,
  });
  await ctx.addInitScript(({ profile, mode }) => {
    for (const [k, v] of Object.entries(profile)) localStorage.setItem(k, v);
    localStorage.setItem('app-theme', mode);
  }, { profile: PROFILE, mode });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => {
    const h = new URL(r.request().url()).hostname;
    if (h === '127.0.0.1' || h === 'localhost' || h.endsWith('googleapis.com') || h.endsWith('gstatic.com')) return r.continue();
    return r.abort();
  });
  return { ctx, page };
}
async function go(page, route, wait = 1800) {
  await page.goto('http://127.0.0.1:5199' + route, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(wait);
}
function record(check, pass, detail, shots = []) {
  results.push({ check, pass: Boolean(pass), detail, shots });
  console.log((pass ? 'PASS ' : 'FAIL ') + check + ' :: ' + JSON.stringify(detail).slice(0, 220));
}

// ---------- 1. login sheet: no auto keyboard, fields + CTA visible ----------
async function loginCheck(width, height) {
  try {
    const { ctx, page } = await mk(width, height);
    await go(page, '/auth', 1800);
    const data = await page.evaluate(() => {
      const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
      const submit = document.querySelector('button[type=submit]');
      const u = document.querySelector('input[type=text]');
      const p = document.querySelector('input[type=password]');
      return {
        keyboardOpen: document.documentElement.hasAttribute('data-soft-keyboard-open'),
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
        user: rect(u), pass: rect(p), submit: rect(submit),
        submitVisible: !!submit && rect(submit).bottom <= innerHeight,
        vh: innerHeight,
      };
    });
    await page.screenshot({ path: evidence('login-' + width), animations: 'disabled' });
    const allVisible = data.user && data.pass && data.submitVisible && data.user.y > 0 && data.pass.bottom <= data.vh && data.submit.bottom <= data.vh;
    record('login sheet ' + width + 'x' + height + ': no auto keyboard + fields/CTA visible', !data.keyboardOpen && allVisible, data, [evidence('login-' + width)]);
    // fill and confirm CTA enables
    await page.locator('input[type=text]').fill('qa_user_123');
    await page.locator('input[type=password]').fill('qa_secret_123');
    await page.waitForTimeout(250);
    const enabled = await page.evaluate(() => { const b = document.querySelector('button[type=submit]'); return b ? !b.disabled : null; });
    record('login ' + width + ': CTA enables after filling credentials', enabled === true, { enabled }, []);
    await ctx.close();
  } catch (e) { record('login sheet ' + width, false, { error: String(e).slice(0, 250) }); }
}
await loginCheck(390, 844);
await loginCheck(1440, 900);

// ---------- 2. journal gate ----------
try {
  const { ctx, page } = await mk(390, 844);
  await go(page, '/journal', 2000);
  const data = await page.evaluate(() => ({
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
    stateTitles: [...document.querySelectorAll('[role=status],[role=alert]')].map((s) => (s.querySelector('h3')?.textContent || '').trim()),
    loginCta: [...document.querySelectorAll('button,a')].some((b) => /تسجيل الدخول/.test((b.textContent || '').trim())),
    keyboardOpen: document.documentElement.hasAttribute('data-soft-keyboard-open'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: evidence('journal-gate-390'), animations: 'disabled' });
  record('journal gate: h1 + auth state + CTA, no keyboard', data.h1.length === 1 && data.stateTitles.length > 0 && data.loginCta && !data.keyboardOpen && data.overflow <= 1, data, [evidence('journal-gate-390')]);
  await ctx.close();
} catch (e) { record('journal gate', false, { error: String(e).slice(0, 250) }); }

// ---------- 3. portal first viewport at 360 / 390 ----------
async function portalCheck(width, height) {
  try {
    const { ctx, page } = await mk(width, height);
    await go(page, '/', 2200);
    const data = await page.evaluate(() => {
      const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
      const h1 = document.querySelector('h1');
      const text = (document.body.innerText || '').replace(/\s+/g, ' ');
      const prayer = [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && /الصلاة القادمة|المغرب|العشاء|الفجر|الظهر|العصر/.test(el.textContent || '')).slice(0, 4).map((el) => el.textContent.trim().slice(0, 24));
      const zeroPattern = /0°|0 ?%|0 ?hPa|0 ?m\/s|0 ?كم\/س/;
      const weatherZeroTiles = [...document.querySelectorAll('.portal-widget-cell, section[aria-labelledby="portal-weather-h"], [class*="weather"]')]
        .filter((el) => /الطقس/.test(el.textContent || '') && zeroPattern.test(el.textContent || ''))
        .map((el) => ({ cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) }));
      const weatherPrompt = /لم نتمكن من قراءة موقعك|تحديد موقعي|طقس موقعك/.test(document.body.innerText || '');
      return {
        h1: h1 ? h1.textContent.trim() : null,
        weatherZeroTiles,
        weatherPrompt,
        h1Visible: !!h1 && rect(h1).bottom > 0 && rect(h1).y < innerHeight,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        hasPrayer: /الصلاة القادمة|الفجر|الظهر|العصر|المغرب|العشاء/.test(text),
        hasDate: /جمادى|محرم|صفر|ربيع|رجب|شعبان|رمضان|شوال|ذو/.test(text),
        firstScreenText: text.slice(0, 220),
        scrollHeight: document.documentElement.scrollHeight,
      };
    });
    await page.screenshot({ path: evidence('portal-' + width), animations: 'disabled' });
    record('portal first viewport ' + width + 'x' + height + ': identity + today content, no overflow', data.h1Visible && data.hasPrayer && data.hasDate && data.overflow <= 1, data, [evidence('portal-' + width)]);
    record('portal ' + width + ': no-location weather shows prompt, no 0°/0%/0 hPa/0 m/s tiles', data.weatherZeroTiles.length === 0 && data.weatherPrompt, { weatherZeroTiles: data.weatherZeroTiles, weatherPrompt: data.weatherPrompt }, [evidence('portal-' + width)]);
    await ctx.close();
  } catch (e) { record('portal ' + width, false, { error: String(e).slice(0, 250) }); }
}
await portalCheck(360, 800);
await portalCheck(390, 844);

// ---------- 4. empty/error surfaces ----------
async function stateCheck(route, name, matcher) {
  try {
    const { ctx, page } = await mk(390, 844);
    await go(page, route, 8000);
    const data = await page.evaluate(() => ({
      text: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800),
      states: [...document.querySelectorAll('[role=status],[role=alert]')].map((s) => ({ role: s.getAttribute('role'), title: (s.querySelector('h3')?.textContent || '').trim().slice(0, 80), body: (s.querySelector('p')?.textContent || '').trim().slice(0, 140) })),
      rawError: /TypeError|Failed to fetch|Error:/.test(document.body.innerText || ''),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    await page.screenshot({ path: evidence(name + '-390'), animations: 'disabled' });
    const ok = matcher(data);
    record(name + ' 390: real state copy, no raw error, no overflow', ok, data, [evidence(name + '-390')]);
    await ctx.close();
    return data;
  } catch (e) { record(name, false, { error: String(e).slice(0, 250) }); return null; }
}
await stateCheck('/crypto', 'crypto-empty', (d) => !d.rawError && d.overflow <= 1 && (d.states.length > 0 || /لا توجد|فارغ|أضف/.test(d.text)));
await stateCheck('/weather', 'weather-empty', (d) => !d.rawError && d.overflow <= 1 && /أين تريد قراءة الطقس/.test(d.text));
await stateCheck('/travel-atlas', 'travel-atlas-fallback', (d) => !d.rawError && d.overflow <= 1 && /وضع مبسّط|لم تصل|الخريطة/.test(d.text));

// ---------- 5. chess primary action at 360x640 ----------
try {
  const { ctx, page } = await mk(360, 640);
  await go(page, '/games/chess', 2500);
  const data = await page.evaluate(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
    const buttons = [...document.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 2);
    const primary = buttons.find((b) => /ابدأ|لعبة جديدة|جديدة/.test((b.textContent || '').trim()));
    return {
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      primary: primary ? { text: primary.textContent.trim().slice(0, 30), rect: rect(primary), disabled: !!primary.disabled } : null,
      buttonCount: buttons.length,
      smallButtons: buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length,
    };
  });
  await page.screenshot({ path: evidence('chess-360'), animations: 'disabled' });
  const inView = data.primary && data.primary.rect.bottom <= 640 && data.primary.rect.w >= 44 && data.primary.rect.h >= 44;
  record('chess 360x640: h1 + primary action visible and >=44px, no overflow', data.h1.length === 1 && inView && data.overflow <= 1, data, [evidence('chess-360')]);
  await ctx.close();
} catch (e) { record('chess 360', false, { error: String(e).slice(0, 250) }); }

// ---------- 6. dialog/drawer focus return + scroll lock ----------
async function focusReturnCheck(route, triggerRe, name) {
  try {
    const { ctx, page } = await mk(390, 844);
    await go(page, route, 2000);
    const trigger = page.locator('button', { hasText: triggerRe }).first();
    await trigger.focus().catch(() => {});
    await trigger.click({ timeout: 5000 });
    await page.waitForTimeout(700);
    const open = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role=dialog],[role=alertdialog]'),
      activeInDialog: !!document.activeElement?.closest?.('[role=dialog],[role=alertdialog]'),
      locked: getComputedStyle(document.body).overflow === 'hidden' || getComputedStyle(document.body).pointerEvents === 'none',
    }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    const closed = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role=dialog],[role=alertdialog]'),
      activeText: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 40),
      activeTag: document.activeElement?.tagName || null,
      unlocked: getComputedStyle(document.body).overflow !== 'hidden',
    }));
    await page.screenshot({ path: evidence(name), animations: 'disabled' });
    record(name + ': focus trap + scroll lock + focus return + unlock', open.dialog && open.activeInDialog && open.locked && !closed.dialog && closed.unlocked && closed.activeTag !== 'BODY', { open, closed }, [evidence(name)]);
    await ctx.close();
  } catch (e) { record(name, false, { error: String(e).slice(0, 250) }); }
}
await focusReturnCheck('/travel-atlas/trips', 'رحلة جديدة', 'dialog-trip-focus-return');
await focusReturnCheck('/dev/design-system', 'افتح حواراً', 'dialog-gallery-focus-return');

// ---------- 7. keyboard open/close (QA-SL-1 target) ----------
try {
  const { ctx, page } = await mk(390, 844);
  await go(page, '/settings/keyboard', 2200);
  const openBtn = page.locator('button[aria-label="فتح لوحة المفاتيح للتجربة"]').first();
  await openBtn.scrollIntoViewIfNeeded();
  await openBtn.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  const open = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-soft-keyboard-open'),
    height: getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),
    panelVisible: (() => { const p = document.querySelector('[data-soft-keyboard-panel]'); if (!p) return false; const btns = p.querySelectorAll('button'); return btns.length > 0 && [...btns].some((b) => b.getBoundingClientRect().height > 20); })(),
  }));
  await page.locator('button[aria-label="إغلاق لوحة المفاتيح"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const closed = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-soft-keyboard-open'),
    height: getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),
    panelVisible: (() => { const p = document.querySelector('[data-soft-keyboard-panel]'); if (!p) return false; const btns = p.querySelectorAll('button'); return [...btns].some((b) => b.getBoundingClientRect().height > 20); })(),
    label: [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).filter((l) => l && /لوحة المفاتيح/.test(l)),
  }));
  await page.screenshot({ path: evidence('keyboard-close'), animations: 'disabled' });
  record('keyboard toggle opens then fully closes (state/height/panel/label agree)', open.attr === 'true' && open.panelVisible && closed.attr !== 'true' && !closed.panelVisible, { open, closed }, [evidence('keyboard-close')]);
  await ctx.close();
} catch (e) { record('keyboard open/close', false, { error: String(e).slice(0, 250) }); }

await browser.close();
fs.writeFileSync(OUT + '/interactions.json', JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ total: results.length, failed: failed.length, checks: results.map((r) => ({ check: r.check, pass: r.pass })) }, null, 1));
process.exit(failed.length ? 1 : 0);
