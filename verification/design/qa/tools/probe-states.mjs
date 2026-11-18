import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = 'verification/design/qa/baseline/states';
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = [
  '/reading','/podcasts','/podcasts/1','/crypto','/german-club/grammar',
  '/german-club/shelf/test-slug','/archive/1','/travel-atlas','/weather',
  '/chat','/chat/g/00000000-0000-0000-0000-000000000000','/time-ledger'
];
const PROFILE = { 'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true' };
const browser = await chromium.launch();
const results = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'ar', timezoneId:'Asia/Riyadh', reducedMotion:'reduce', colorScheme:'dark' });
  await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)}, PROFILE);
  const page = await ctx.newPage();
  const netLog = [];
  page.on('requestfailed', (r) => { if (!r.url().startsWith('http://127.0.0.1')) netLog.push(r.url().slice(0,80)); });
  await page.route('**/*', (r) => {
    const host = new URL(r.request().url()).hostname;
    if (host==='127.0.0.1'||host==='localhost'||host.endsWith('googleapis.com')||host.endsWith('gstatic.com')) return r.continue();
    if (host.endsWith('supabase.co')) {
      // Fail data requests fast, like an offline/blocked network.
      return r.abort('failed');
    }
    return r.abort();
  });
  await page.goto('http://127.0.0.1:5199'+route, { waitUntil:'domcontentloaded' }).catch(()=>{});
  await page.waitForTimeout(8000);
  const data = await page.evaluate(() => {
    const txt = (document.body.innerText || '').replace(/\s+/g,' ').trim();
    const states = [...document.querySelectorAll('[role=status],[role=alert]')].map(el => ({ role: el.getAttribute('role'), title: (el.querySelector('h3')?.textContent || '').trim().slice(0,60), body: (el.querySelector('p')?.textContent || '').trim().slice(0,100) }));
    const spinners = [...document.querySelectorAll('.animate-spin, svg.animate-spin')].length;
    const skeletons = [...document.querySelectorAll('[class*=skeleton],[class*=animate-pulse]')].length;
    const retries = [...document.querySelectorAll('button')].filter(b=>/إعادة|أعد|حاول|المحاولة|retry/i.test(b.textContent||'')).map(b=>b.textContent.trim().slice(0,40)).slice(0,4);
    const h1 = [...document.querySelectorAll('h1')].map(h=>h.textContent.trim()).slice(0,3);
    const headings = [...document.querySelectorAll('h1,h2,h3')].map(h=>h.tagName+':'+h.textContent.trim().slice(0,40)).slice(0,8);
    const imgs = [...document.querySelectorAll('img')].length;
    const brokenImgs = [...document.querySelectorAll('img')].filter(i=>i.complete && i.naturalWidth===0).length;
    return {
      h1, states, spinners, skeletons, retries, headings, imgs, brokenImgs,
      textSnippet: txt.slice(0, 320),
      textLen: txt.length,
      scrollHeight: document.documentElement.scrollHeight, vh: innerHeight,
      hasOfflineText: /بلا اتصال|غير متصل|انقطع|تعذر الاتصال|تعذّر الاتصال/.test(txt),
      hasLoadText: /جار|يتم جلب|يتم التحميل|تحميل/.test(txt),
      hasErrorText: /خطأ|فشل|تعذر|تعذّر|لم نتمكن/.test(txt),
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
  await page.screenshot({ path: OUT + '/state-' + route.replace(/[^a-z0-9]+/gi,'_') + '.png', animations:'disabled' });
  results.push({ route, ...data, failedRequests: netLog.slice(0,3) });
  console.log('PROBE ' + route + ' :: states=' + data.states.length + ' spinners=' + data.spinners + ' skeletons=' + data.skeletons + ' retries=' + data.retries.length + ' h1=' + JSON.stringify(data.h1) + ' scrollH=' + data.scrollHeight + ' textLen=' + data.textLen);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(OUT+'/states-probe.json', JSON.stringify(results,null,1));
console.log(JSON.stringify({routes:ROUTES.length, out:OUT}));
