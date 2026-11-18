import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT='verification/design/qa/shared-layer/interactions'; fs.mkdirSync(OUT,{recursive:true});
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
async function mk(width=390,height=844){const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);const page=await ctx.newPage();await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});return {ctx,page};}
async function go(page,route,wait=1800){await page.goto('http://127.0.0.1:5199'+route,{waitUntil:'domcontentloaded'}).catch(()=>{});await page.waitForTimeout(wait);}
const out={};
async function pageBasics(page){return page.evaluate(()=>{const rect=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}};const desc=(el)=>el?el.tagName.toLowerCase()+(el.getAttribute('type')?'['+el.getAttribute('type')+']':'')+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':'')+(el.tagName!=='INPUT'&&el.textContent?' "'+el.textContent.trim().slice(0,26)+'"':''):null;const h1s=[...document.querySelectorAll('h1')].map(h=>({text:h.textContent.trim().slice(0,60),rect:rect(h),visible:(()=>{const r=h.getBoundingClientRect();return r.width>2&&r.height>2;})()}));const submit=[...document.querySelectorAll('button[type=submit],button')].find(b=>/^(دخول|تسجيل الدخول|إنشاء حساب)$/.test((b.textContent||'').trim()))||null;const inputs=[...document.querySelectorAll('input')].filter(i=>i.type!=='hidden'&&i.getBoundingClientRect().width>2).map(i=>({type:i.type,label:i.getAttribute('aria-label')||i.getAttribute('placeholder')||i.getAttribute('name'),rect:rect(i)}));return {path:location.pathname,h1s,h1Count:h1s.length,keyboardOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),kbHeight:getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),submit:submit?{text:submit.textContent.trim().slice(0,20),rect:rect(submit),disabled:!!submit.disabled,visibleBottom:rect(submit)?.bottom<=innerHeight}:null,inputs,bodyOverflow:getComputedStyle(document.body).overflow,dock:!!document.querySelector('.portal-dock'),dockAttr:document.documentElement.getAttribute('data-portal-dock'),dialog:!!document.querySelector('[role=dialog]'),states:[...document.querySelectorAll('[role=status],[role=alert]')].map(s=>({role:s.getAttribute('role'),title:(s.querySelector('h3')?.textContent||'').trim().slice(0,50),body:(s.querySelector('p')?.textContent||'').trim().slice(0,80)})),viewport:{w:innerWidth,h:innerHeight}};});}
// 1 auth/profile/journal/settings redirects/games/grammar/podcasts/place
const routes=['/auth','/profile','/journal','/settings/theme','/settings/font','/games/memory','/games/sudoku','/german-club/grammar','/podcasts/1','/travel-atlas/place/1'];
for (const route of routes) {
  try{const {ctx,page}=await mk();await go(page,route,2200);
    const info=await pageBasics(page);
    if(route==='/games/sudoku'){info.cells=await page.evaluate(()=>{const cells=[...document.querySelectorAll('button.aspect-square')].map(b=>b.getBoundingClientRect());return {count:cells.length,min:Math.min(...cells.map(c=>Math.round(c.width)))};});}
    if(route==='/german-club/grammar'){info.h1Wrap=await page.evaluate(()=>{const h=document.querySelector('h1');if(!h)return null;const r=h.getBoundingClientRect();const cs=getComputedStyle(h);return {scrollWidth:h.scrollWidth,clientWidth:h.clientWidth,height:Math.round(r.height),width:Math.round(r.width),lineClamp:cs.webkitLineClamp};});}
    if(route==='/podcasts/1'){info.h1Detail=await page.evaluate(()=>[...document.querySelectorAll('h1')].map(h=>({text:h.textContent.trim().slice(0,40),html:h.outerHTML.slice(0,120)})));}
    if(route==='/travel-atlas/place/1'){info.place=await page.evaluate(()=>({headingTexts:[...document.querySelectorAll('h1,h2,h3')].map(h=>h.tagName+':'+h.textContent.trim().slice(0,40)).slice(0,6),pageHeader:!!document.querySelector('header'),titleEl:[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/أطلس الرحلات/.test(e.textContent||'')).map(e=>e.tagName.toLowerCase()).slice(0,3)}));}
    await page.screenshot({path:OUT+'/'+route.replace(/[^a-z0-9]+/gi,'_')+'-390.png',animations:'disabled'});
    out[route]=info;await ctx.close();
  } catch(e){out[route]={error:String(e).slice(0,250)};}
}
// 2 auth at 1440
try{const {ctx,page}=await mk(1440,900);await go(page,'/auth',2000);out['/auth@1440']=await pageBasics(page);await page.screenshot({path:OUT+'/auth-1440.png',animations:'disabled'});await ctx.close();}catch(e){out['/auth@1440']={error:String(e).slice(0,200)}}
// 3 dock behavior
async function dockProbe(route){
 const {ctx,page}=await mk();await go(page,route,2000);
 const first=await page.evaluate(()=>({dock:!!document.querySelector('.portal-dock'),attr:document.documentElement.getAttribute('data-portal-dock'),scrollY:Math.round(scrollY)}));
 await page.evaluate(()=>window.scrollTo(0,900));await page.waitForTimeout(700);
 const scrolled=await page.evaluate(()=>{const d=document.querySelector('.portal-dock');const r=d?d.getBoundingClientRect():null;return {dock:!!d,attr:document.documentElement.getAttribute('data-portal-dock'),rect:r?{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}:null};});
 await page.screenshot({path:OUT+'/dock-'+route.replace(/[^a-z0-9]+/gi,'_')+'.png',animations:'disabled'});
 await ctx.close();return {first,scrolled};
}
const dockRoutes=['/journal','/games/memory','/chat','/travel-atlas','/settings/appearance'];
out.dock={};
for(const r of dockRoutes){try{out.dock[r]=await dockProbe(r);}catch(e){out.dock[r]={error:String(e).slice(0,200)};}}
// 4 keyboard toggle on /settings/keyboard
try{const {ctx,page}=await mk();await go(page,'/settings/keyboard',2000);
 const toggle=page.locator('button[aria-label="لوحة المفاتيح الذكية"]').first();
 const before=await page.evaluate(()=>({kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),dock:!!document.querySelector('.portal-dock'),attr:document.documentElement.getAttribute('data-portal-dock')}));
 let opened=null,closed=null;
 try{await toggle.click({timeout:4000});await page.waitForTimeout(900);
   opened=await page.evaluate(()=>({kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),height:getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),dock:!!document.querySelector('.portal-dock'),attr:document.documentElement.getAttribute('data-portal-dock'),toggles:[...document.querySelectorAll('button')].filter(b=>/لوحة المفاتيح/.test(b.getAttribute('aria-label')||'')).map(b=>b.getAttribute('aria-label'))}));
   await page.screenshot({path:OUT+'/keyboard-open.png',animations:'disabled'});
   const closeBtn=page.locator('button[aria-label="إغلاق لوحة المفاتيح"]').first();await closeBtn.click({timeout:4000});await page.waitForTimeout(700);
   closed=await page.evaluate(()=>({kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),height:getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),active:(document.activeElement?.getAttribute('aria-label')||document.activeElement?.tagName||null),dock:!!document.querySelector('.portal-dock')}));
 }catch(e){opened={error:String(e).slice(0,250)};}
 out.keyboardToggle={before,opened,closed};await ctx.close();}catch(e){out.keyboardToggle={error:String(e).slice(0,250)}}
// 5 dialog focus return: trip dialog (controlled) + gallery DialogTrigger (expected correct)
try{const {ctx,page}=await mk();await go(page,'/travel-atlas/trips');
 await page.locator('button',{hasText:'رحلة جديدة'}).first().click();await page.waitForTimeout(600);
 const open=await page.evaluate(()=>({dialog:!!document.querySelector('[role=dialog]'),activeInDialog:!!document.activeElement?.closest?.('[role=dialog]'),bodyOverflow:getComputedStyle(document.body).overflow}));
 await page.keyboard.press('Escape');await page.waitForTimeout(900);
 const closed=await page.evaluate(()=>({dialog:!!document.querySelector('[role=dialog]'),active:(document.activeElement?.tagName||'NULL')+(document.activeElement?.getAttribute?.('aria-label')?'{'+document.activeElement.getAttribute('aria-label')+'}':''),bodyOverflow:getComputedStyle(document.body).overflow}));
 out.dialogFocusReturn={tripDialog:{open,closed}};await ctx.close();}catch(e){out.dialogFocusReturn={error:String(e).slice(0,250)}}
try{const {ctx,page}=await mk();await go(page,'/dev/design-system',2200);
 const triggers=await page.evaluate(()=>[...document.querySelectorAll('[role=button],button')].filter(b=>/حوار|فتح/.test(b.textContent||'')).slice(0,6).map(b=>b.textContent.trim().slice(0,30)));
 out.dialogFocusReturn=out.dialogFocusReturn||{};out.dialogFocusReturn.galleryTriggers=triggers;
 const trig=page.locator('button',{hasText:/فتح الحوار|حوار/}).first();
 await trig.click({timeout:4000}).catch(()=>{});await page.waitForTimeout(600);
 const open=await page.evaluate(()=>({dialog:!!document.querySelector('[role=dialog]'),active:(document.activeElement?.tagName||'')}));
 await page.keyboard.press('Escape');await page.waitForTimeout(800);
 const closed=await page.evaluate(()=>({dialog:!!document.querySelector('[role=dialog]'),active:(document.activeElement?.tagName||'NULL')+(document.activeElement?.textContent?' "'+document.activeElement.textContent.trim().slice(0,25)+'"':'')}));
 out.dialogFocusReturn.gallery={open,closed};await ctx.close();}catch(e){if(out.dialogFocusReturn)out.dialogFocusReturn.gallery={error:String(e).slice(0,200)};}
await browser.close();
fs.writeFileSync(OUT+'/shared-layer-interactions.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
