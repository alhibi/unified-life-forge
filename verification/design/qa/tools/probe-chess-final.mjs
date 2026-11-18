import { chromium } from '@playwright/test';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});
await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
await page.goto('http://127.0.0.1:5199/games/chess',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2600);
const info=await page.evaluate(()=>{
  const rect=(el)=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}};
  const btns=[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>2).map(b=>({text:(b.textContent||'').trim().replace(/\s+/g,' ').slice(0,30),rect:rect(b),disabled:!!b.disabled}));
  const primary=btns.find(b=>/لعبة جديدة/.test(b.text));
  const aboveFold=btns.filter(b=>b.rect.bottom<=innerHeight);
  return {vh:innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollY:Math.round(scrollY),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,primary,buttonsAboveFold:aboveFold.slice(0,10),allButtons:btns.slice(0,14)};
});
// where is the CTA relative to the bottom, and is there an indication to scroll?
await page.screenshot({path:'verification/design/qa/final/shots/chess-360-final.png',animations:'disabled'});
await page.evaluate(()=>window.scrollTo(0,200));await page.waitForTimeout(400);
const after=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/لعبة جديدة/.test(x.textContent||''));const r=b.getBoundingClientRect();return {scrollY:Math.round(scrollY),primary:{y:Math.round(r.y),bottom:Math.round(r.bottom)}};});
await page.screenshot({path:'verification/design/qa/final/shots/chess-360-scrolled.png',animations:'disabled'});
console.log(JSON.stringify({info,after},null,1));
await ctx.close();await browser.close();
