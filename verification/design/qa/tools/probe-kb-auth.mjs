import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT='verification/design/qa/shared-layer/interactions';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
async function mk(){const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);const page=await ctx.newPage();await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});return {ctx,page};}
const out={};
// A. keyboard toggle on /settings/keyboard
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/settings/keyboard',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2200);
 const labels=await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')).filter(Boolean).slice(0,30));
 const before=await page.evaluate(()=>({kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),dock:!!document.querySelector('.portal-dock')}));
 let opened=null,closed=null,err=null;
 try{
  const t=page.locator('button[aria-label="فتح لوحة المفاتيح للتجربة"]').first();
  await t.scrollIntoViewIfNeeded();await t.click({timeout:5000});await page.waitForTimeout(900);
  opened=await page.evaluate(()=>({kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),height:getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),labels:[...document.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')).filter(l=>l&&/لوحة المفاتيح/.test(l)),dock:!!document.querySelector('.portal-dock'),bodyOverflow:getComputedStyle(document.body).overflow}));
  await page.screenshot({path:OUT+'/keyboard-open.png',animations:'disabled'});
  const c=page.locator('button[aria-label="إغلاق لوحة المفاتيح"]').first();await c.click({timeout:5000});await page.waitForTimeout(800);
  closed=await page.evaluate(()=>({kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),height:getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'),active:(document.activeElement?.getAttribute('aria-label')||document.activeElement?.tagName||null),dock:!!document.querySelector('.portal-dock')}));
 }catch(e){err=String(e).slice(0,250);}
 out.keyboardToggle={labels,before,opened,closed,error:err};await ctx.close();}catch(e){out.keyboardToggle={error:String(e).slice(0,250)}}
// B. auth form fill enables submit and no keyboard
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/auth',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1600);
 const submitSel='button[type=submit]';
 const before=await page.evaluate(()=>({disabled:document.querySelector('button[type=submit]')?.disabled,kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open')}));
 await page.locator('input[type=text]').fill('testuser123');await page.locator('input[type=password]').fill('secret123');
 await page.waitForTimeout(200);
 const after=await page.evaluate(()=>{const b=document.querySelector('button[type=submit]');const r=b?.getBoundingClientRect();return {disabled:b?.disabled,kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),submitBottom:r?Math.round(r.bottom):null,vh:innerHeight,active:document.activeElement?.tagName};});
 await page.screenshot({path:OUT+'/auth-filled.png',animations:'disabled'});
 out.authForm={before,after};await ctx.close();}catch(e){out.authForm={error:String(e).slice(0,250)}}
await browser.close();
fs.writeFileSync(OUT+'/keyboard-auth.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
