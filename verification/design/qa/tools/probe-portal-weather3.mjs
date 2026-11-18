import { chromium } from '@playwright/test';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});
await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
await page.goto('http://127.0.0.1:5199/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2600);
const tile=await page.evaluate(()=>{
  const cells=[...document.querySelectorAll('.portal-widget-cell')];
  const hits=cells.map((el,i)=>({i,text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,120),cls:(typeof el.className==='string'?el.className:'').slice(0,80)})).filter(x=>/الطقس|0°|0 ?%|0 ?hPa|0 ?m\/s/.test(x.text));
  const zeroCells=cells.map((el,i)=>({i,text:(el.textContent||'').replace(/\s+/g,' ').trim()}));
  const weather=[...document.querySelectorAll('*')].filter(el=>el.children.length<8&&/الطقس الآن/.test(el.textContent||'')&&el.getBoundingClientRect().width>60&&el.getBoundingClientRect().width<400).slice(0,3).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName.toLowerCase(),text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,120),rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)},visible:r.width>2&&r.height>2};});
  return {hits,weather,allCellTexts:zeroCells.slice(0,24)};
});
// scroll offending tile into view if found
const idx=await page.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>e.children.length<8&&/الطقس الآن/.test(e.textContent||'')&&e.getBoundingClientRect().width>60&&e.getBoundingClientRect().width<400);if(!el)return null;el.scrollIntoView({block:'center'});return true;});
await page.waitForTimeout(600);
const shot=await page.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>e.children.length<8&&/الطقس الآن/.test(e.textContent||'')&&e.getBoundingClientRect().width>60&&e.getBoundingClientRect().width<400);if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.max(0,Math.round(r.x)-10),y:Math.max(0,Math.round(r.y)-60),w:Math.min(390,Math.round(r.width)+20),h:Math.min(500,Math.round(r.height)+80)};});
await page.screenshot({path:'verification/design/qa/final-prep/portal-weather-zero-tile.png',animations:'disabled',clip:shot||undefined});
console.log(JSON.stringify({idx,tile,shot},null,1));
await ctx.close();await browser.close();
