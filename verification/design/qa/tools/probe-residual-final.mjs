import { chromium } from '@playwright/test';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
async function mk(){const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);const page=await ctx.newPage();await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});return {ctx,page};}
const out={};
// mihrab tabpanel focus ring
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/mihrab',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);
 await page.locator('[role=tabpanel]').first().focus().catch(()=>{});
 out.mihrabTabpanel=await page.evaluate(()=>{const el=document.querySelector('[role=tabpanel]');if(!el)return null;const cs=getComputedStyle(el);return {tabindex:el.getAttribute('tabindex'),focusVisible:el.matches(':focus-visible'),outline:cs.outlineStyle+' '+cs.outlineWidth,boxShadow:cs.boxShadow};});
 await ctx.close();}catch(e){out.mihrabTabpanel={error:String(e).slice(0,200)}}
// time-ledger stateview title
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/time-ledger',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2500);
 out.timeLedger=await page.evaluate(()=>[...document.querySelectorAll('[role=status],[role=alert]')].map(s=>({title:(s.querySelector('h3')?.textContent||'').trim(),body:(s.querySelector('p')?.textContent||'').trim().slice(0,80)})));
 await ctx.close();}catch(e){out.timeLedger={error:String(e).slice(0,200)}}
// motion settings raw spring readout
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/settings/motion',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);
 out.motionSettings=await page.evaluate(()=>({rawSpring:/spring k=|c=|nav=/.test(document.body.innerText||''),snippet:(document.body.innerText||'').match(/spring[^\n]{0,60}/)?.[0]||null}));
 await ctx.close();}catch(e){out.motionSettings={error:String(e).slice(0,200)}}
// pkm/mind canvas/3D presence
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/pkm/mind',{waitUntil:'domcontentloaded'});await page.waitForTimeout(3000);
 out.pkmMind=await page.evaluate(()=>({canvas:document.querySelectorAll('canvas').length,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),svg:document.querySelectorAll('svg').length}));
 await ctx.close();}catch(e){out.pkmMind={error:String(e).slice(0,200)}}
// auth first-tab focus order + visible focus (quick a11y spot)
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/auth',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1600);
 const stops=[];for(let i=0;i<4;i++){await page.keyboard.press('Tab');await page.waitForTimeout(70);stops.push(await page.evaluate(()=>{const el=document.activeElement;const cs=el?getComputedStyle(el):null;return el?{tag:el.tagName.toLowerCase(),label:(el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.textContent||'').trim().slice(0,30),focusVisible:el.matches(':focus-visible'),outline:cs.outlineStyle+' '+cs.outlineWidth}:null;}));}
 out.authTabOrder=stops;await ctx.close();}catch(e){out.authTabOrder={error:String(e).slice(0,200)}}
await browser.close();
console.log(JSON.stringify(out,null,1));
