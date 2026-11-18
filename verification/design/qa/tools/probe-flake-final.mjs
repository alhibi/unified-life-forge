import { chromium } from '@playwright/test';
const P={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});
await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},P);
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
await page.goto('http://127.0.0.1:5199/games/chess/puzzles',{waitUntil:'domcontentloaded'});
async function measure(){return page.evaluate(()=>{
  const cells=[...document.querySelectorAll('button.aspect-square')];
  const rects=cells.map(c=>c.getBoundingClientRect());
  const board=cells[0]?.parentElement;
  const transform=board?getComputedStyle(board).transform:null;
  return {count:cells.length,minW:Math.min(...rects.map(r=>r.width)),maxW:Math.max(...rects.map(r=>r.width)),rounded:Math.round(Math.min(...rects.map(r=>r.width))*10)/10,boardTransform:transform,boardClass:(typeof board?.className==='string'?board.className:'').slice(0,120),exempt:cells[0]?.getAttribute('data-touch-exempt')||null,label:cells[0]?.getAttribute('aria-label')};
});}
const out={};
await page.waitForTimeout(900);out.t900=await measure();
await page.waitForTimeout(600);out.t1500=await measure();
await page.waitForTimeout(1000);out.t2500=await measure();
await page.waitForTimeout(1500);out.t4000=await measure();
await page.screenshot({path:'verification/design/qa/final/contrast-verify/chess-puzzles-cells.png',animations:'disabled'});
console.log(JSON.stringify(out,null,1));
await ctx.close();
// dev gallery h1 race: 4 fresh loads, sample h1 at 900ms
const flake=[];for(let i=0;i<4;i++){const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});await c.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},P);const p=await c.newPage();await p.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});await p.goto('http://127.0.0.1:5199/dev/design-system',{waitUntil:'domcontentloaded'});await p.waitForTimeout(900);flake.push(await p.evaluate(()=>document.querySelectorAll('h1').length));await c.close();}
console.log(JSON.stringify({devGalleryH1At900ms:flake}));
await browser.close();
