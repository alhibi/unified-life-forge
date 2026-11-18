import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = 'verification/design/qa/baseline/interactions';
fs.mkdirSync(OUT, { recursive: true });
const PROFILE = { 'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'false' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, { width=390, height=844, reducedMotion='reduce' } = {}) {
  const ctx = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1, locale:'ar', timezoneId:'Asia/Riyadh', reducedMotion, colorScheme:'dark' });
  await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)}, PROFILE);
  const page = await ctx.newPage();
  await page.route('**/*', (r) => {
    const host = new URL(r.request().url()).hostname;
    if (host==='127.0.0.1'||host==='localhost'||host.endsWith('googleapis.com')||host.endsWith('gstatic.com')) return r.continue();
    return r.abort();
  });
  return { ctx, page };
}
async function goto(page, route, wait=1500) {
  await page.goto('http://127.0.0.1:5199'+route, { waitUntil:'domcontentloaded' }).catch(()=>{});
  await page.waitForTimeout(wait);
}
const state = () => document.documentElement.getAttribute('data-soft-keyboard-open');
async function dialogSnapshot(page, label) {
  return page.evaluate((label) => {
    const desc = (el) => el ? el.tagName.toLowerCase() + (el.getAttribute('role')?'[role='+el.getAttribute('role')+']':'') + (el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':'') + (el.textContent?' "'+(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40)+'"':'') : null;
    const dialogs = [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map(d=>({ desc: desc(d), rect:(()=>{const r=d.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}})(), modal: d.getAttribute('aria-modal'), title: (d.querySelector('[data-radix-dialog-title],h2,h3')?.textContent||'').trim().slice(0,50) }));
    const active = document.activeElement;
    return {
      label,
      dialogCount: dialogs.length, dialogs,
      active: desc(active), activeInDialog: !!active?.closest?.('[role=dialog]'),
      bodyOverflow: getComputedStyle(document.body).overflow, bodyInlineOverflow: document.body.style.overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
      scrollY: window.scrollY,
      keyboardOpen: document.documentElement.hasAttribute('data-soft-keyboard-open'),
      kbHeightVar: getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),
      scrollLocked: getComputedStyle(document.body).overflow === 'hidden' || getComputedStyle(document.body).position === 'fixed',
      focusVisible: active ? active.matches(':focus-visible') : null,
    };
  }, label);
}
async function tabWalk(page, steps) {
  const seen = [];
  for (let i=0;i<steps;i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
    seen.push(await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { stop: 'body' };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g,' ').slice(0, 40),
        role: el.getAttribute('role'),
        focusVisible: el.matches(':focus-visible'),
        outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
        boxShadow: cs.boxShadow.slice(0, 60),
        visible: r.width >= 1 && r.height >= 1 && cs.visibility !== 'hidden',
        y: Math.round(r.y),
      };
    }));
  }
  return seen;
}

const browser = await chromium.launch();
const report = {};

// ---------- 1. Dialog: travel-atlas/trips "رحلة جديدة" ----------
try {
  const { ctx, page } = await newPage(browser);
  await goto(page, '/travel-atlas/trips');
  const trigger = page.locator('button', { hasText: 'رحلة جديدة' }).first();
  const triggerText = await trigger.textContent().catch(()=>null);
  const before = await dialogSnapshot(page, 'before');
  await trigger.click({ timeout: 5000 }).catch(async (e) => { report.tripDialogTriggerError = String(e).slice(0,200); });
  await page.waitForTimeout(700);
  const open = await dialogSnapshot(page, 'open');
  await page.screenshot({ path: OUT+'/trip-dialog-390-open.png', animations:'disabled' });
  const tabs = await tabWalk(page, 9);
  await page.screenshot({ path: OUT+'/trip-dialog-390-tabbed.png', animations:'disabled' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const closed = await dialogSnapshot(page, 'after-escape');
  await page.screenshot({ path: OUT+'/trip-dialog-390-closed.png', animations:'disabled' });
  report.tripDialog = { triggerText: (triggerText||'').trim().slice(0,50), before, open, tabStops: tabs, closed };
  await ctx.close();
} catch (e) { report.tripDialog = { error: String(e).slice(0,300) }; }

// ---------- 2. Dialog: german-club dictionary word modal ----------
try {
  const { ctx, page } = await newPage(browser);
  await goto(page, '/german-club/dictionary');
  const trigger = page.locator('button', { hasText: 'Systematische Entwicklung' }).first();
  const triggerText = await trigger.textContent().catch(()=>null);
  await trigger.click({ timeout: 5000 }).catch((e) => { report.germanDialogTriggerError = String(e).slice(0,200); });
  await page.waitForTimeout(700);
  const open = await dialogSnapshot(page, 'open');
  await page.screenshot({ path: OUT+'/german-dict-modal-390-open.png', animations:'disabled' });
  const tabs = await tabWalk(page, 8);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const closed = await dialogSnapshot(page, 'after-escape');
  report.germanDictionaryModal = { triggerText: (triggerText||'').trim().slice(0,60), open, tabStops: tabs, closed };
  await ctx.close();
} catch (e) { report.germanDictionaryModal = { error: String(e).slice(0,300) }; }

// ---------- 3. Tab order + focus visible ----------
report.tabOrder = {};
for (const route of ['/', '/settings/appearance', '/mihrab']) {
  try {
    const { ctx, page } = await newPage(browser);
    await goto(page, route);
    const first = await page.evaluate(() => ({ active: document.activeElement?.tagName || null, h1: [...document.querySelectorAll('h1')].map(h=>h.textContent.trim()) }));
    const stops = await tabWalk(page, 12);
    await page.screenshot({ path: OUT+'/tab-'+route.replace(/[^a-z0-9]+/gi,'_')+'-ellow.png', animations:'disabled' });
    report.tabOrder[route] = { first, stops };
    await ctx.close();
  } catch (e) { report.tabOrder[route] = { error: String(e).slice(0,300) }; }
}

// ---------- 4. RTL / mixed text ----------
report.rtl = {};
for (const route of ['/german-club', '/german-club/dictionary', '/chat']) {
  try {
    const { ctx, page } = await newPage(browser);
    await goto(page, route);
    const data = await page.evaluate(() => {
      const latin = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.textContent || !/[A-Za-z]{3}/.test(el.textContent)) continue;
        if (el.children.length > 0 && [...el.children].some(c=>/[A-Za-z]{3}/.test(c.textContent||''))) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2) continue;
        latin.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent||'').trim().slice(0,50),
          direction: cs.direction,
          dirAttr: el.closest('[dir]')?.getAttribute('dir') || null,
          inlineBlock: cs.display,
        });
      }
      return {
        htmlDir: document.documentElement.dir, htmlLang: document.documentElement.lang,
        latinCount: latin.length, latin: latin.slice(0, 12),
        leak: latin.filter(x => x.direction === 'ltr' && x.dirAttr !== 'ltr' && !['input','textarea'].includes(x.tag)).slice(0,5),
      };
    });
    await page.screenshot({ path: OUT+'/rtl-'+route.replace(/[^a-z0-9]+/gi,'_')+'.png', animations:'disabled' });
    report.rtl[route] = data;
    await ctx.close();
  } catch (e) { report.rtl[route] = { error: String(e).slice(0,300) }; }
}

// ---------- 5. Reduced motion ----------
report.motion = {};
async function motionProbe(browser, reducedMotion, label) {
  const { ctx, page } = await newPage(browser, { reducedMotion });
  await goto(page, '/settings/motion', 1800);
  const read = () => page.evaluate(() => {
    const labels = [...document.querySelectorAll('*')].filter(el => (el.textContent||'').trim() === 'تقليل الحركة');
    let cb = null; let row = null;
    for (const el of labels) {
      const container = el.closest('[class*=flex]')?.parentElement || el.parentElement;
      const candidate = container?.querySelector('[role=switch],button[aria-checked],input[type=checkbox]');
      if (candidate) { cb = candidate; row = el; break; }
    }
    return {
      htmlReduceAttr: document.documentElement.getAttribute('data-reduced-motion'),
      htmlSource: document.documentElement.getAttribute('data-reduced-motion-source'),
      osMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      stored: localStorage.getItem('app-reduced-motion'),
      switchFound: !!cb,
      switchChecked: cb ? (cb.getAttribute('aria-checked') ?? cb.checked ?? null) : null,
      transitionDuration: getComputedStyle(document.querySelector('button.app-pressable') || document.body).transitionDuration,
      animationDuration: getComputedStyle(document.querySelector('button.app-pressable') || document.body).animationDuration,
    };
  });
  const initial = await read();
  let clicked = null;
  try {
    const rowText = page.getByText('تقليل الحركة', { exact: true }).first();
    await rowText.scrollIntoViewIfNeeded();
    const container = rowText.locator('xpath=ancestor::*[self::div or self::label][1]');
    const sw = container.locator('[role=switch],button[aria-checked],input[type=checkbox]').first();
    await sw.click({ timeout: 4000 });
    await page.waitForTimeout(500);
    clicked = 'clicked';
  } catch (e) { clicked = String(e).slice(0,160); }
  const after = await read();
  await page.screenshot({ path: OUT+'/motion-'+label+'.png', animations:'disabled' });
  await ctx.close();
  return { label, reducedMotion, initial, clicked, after };
}
try { report.motion.osReduce = await motionProbe(browser, 'reduce', 'os-reduce'); } catch(e) { report.motion.osReduce = { error: String(e).slice(0,300) }; }
try { report.motion.osNone = await motionProbe(browser, 'no-preference', 'os-none'); } catch(e) { report.motion.osNone = { error: String(e).slice(0,300) }; }

await browser.close();
fs.writeFileSync(OUT+'/interactions.json', JSON.stringify(report,null,1));
console.log(JSON.stringify(report, null, 1));
