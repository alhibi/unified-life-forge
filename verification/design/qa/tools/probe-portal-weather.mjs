import { chromium } from '@playwright/test';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});
await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
await page.goto('http://127.0.0.1:5199/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2500);
const info=await page.evaluate(()=>{
  const hits=[...document.querySelectorAll('*')].filter(el=>el.children.length<6&&/الطقس/.test(el.textContent||'')&&el.getBoundingClientRect().width>100).slice(0,4);
  return hits.map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName.toLowerCase(),cls:(typeof el.className==='string'?el.className:'').slice(0,120),text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,220),rect:{y:Math.round(r.y),bottom:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height)},dataAttrs:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value).slice(0,5)};});
});
const text=await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,600));
const zeros=await page.evaluate(()=>{const t=document.body.innerText;const m=t.match(/(0°|0 ?%|0 ?hPa|0 ?m\/s|0 ?كم\/س|٠°|٠ ?%)/g);return m?m.slice(0,10):[];});
console.log(JSON.stringify({info,text,zeros},null,1));
await page.screenshot({path:'verification/design/qa/final-prep/portal-weather-now.png',animations:'disabled'});
await ctx.close();await browser.close();
