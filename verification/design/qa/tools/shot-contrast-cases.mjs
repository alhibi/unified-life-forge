import { chromium } from '@playwright/test';
const P={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
async function shot(route,mode,text,name){
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:mode});
 await ctx.addInitScript(({p,mode})=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v);localStorage.setItem('app-theme',mode);},{p:P,mode});
 const page=await ctx.newPage();
 await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
 await page.goto('http://127.0.0.1:5199'+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(2400);
 if(text){await page.evaluate((t)=>{const els=[...document.querySelectorAll('*')].filter(e=>(e.textContent||'').trim().length<60&&(e.textContent||'').trim()===t);const el=els[els.length-1];if(el)el.scrollIntoView({block:'center'});},text);await page.waitForTimeout(500);}
 const info=await page.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>(e.textContent||'').includes('التالي')&&e.children.length<=2&&e.getBoundingClientRect().width>20&&e.getBoundingClientRect().width<300);if(!el)return {found:false};const r=el.getBoundingClientRect();const cs=getComputedStyle(el);const parent=el.parentElement;const pc=parent?getComputedStyle(parent):null;return {found:true,text:(el.textContent||'').trim(),rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},color:cs.color,parentBg:pc?.backgroundColor,parentClass:(typeof parent?.className==='string'?parent.className:'').slice(0,160)};});
 await page.screenshot({path:'verification/design/qa/final/contrast-verify/'+name+'.png',animations:'disabled'});
 await ctx.close();return info;
}
const a=await shot('/chat','dark',null,'chat-gate-dark');
const b=await shot('/games/chess/puzzles','dark',null,'chess-puzzles-dark');
const c=await shot('/occasions','dark',null,'occasions-dark');
console.log(JSON.stringify({chat:a,chessNext:b,occasions:c},null,1));
await browser.close();
