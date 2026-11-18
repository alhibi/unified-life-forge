import { chromium } from '@playwright/test';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});
await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
await page.goto('http://127.0.0.1:5199/settings/appearance',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);
const sw=page.locator('button[role=switch]').first();
const info=await sw.evaluate((el)=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);const after=getComputedStyle(el,'::after');return {rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},checked:el.getAttribute('aria-checked')||el.getAttribute('data-state'),afterContent:after.content,afterW:after.width,afterH:after.height,afterPos:after.position,label:el.getAttribute('aria-label')};});
// click 8px above the visual track centre (inside 44x44 ::after, outside 44x28 track)
const r=info.rect;const x=r.x+r.w/2,y=r.y+r.h/2;
const hitAbove=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y-8);const sw=document.querySelector('button[role=switch]');return {tag:el?.tagName.toLowerCase(),isSwitch:!!el?.closest?.('button[role=switch]'),matchesSwitch:el===sw};},{x,y});
const before=await sw.getAttribute('data-state');
await page.mouse.click(x,y-8);
await page.waitForTimeout(400);
const after=await sw.getAttribute('data-state');
console.log(JSON.stringify({info,hitAbove,before,after,toggled:before!==after},null,1));
await ctx.close();await browser.close();
