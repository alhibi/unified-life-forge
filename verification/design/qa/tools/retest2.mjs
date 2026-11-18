import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT='verification/design/qa/baseline/retest2'; fs.mkdirSync(OUT,{recursive:true});
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'false'};
const browser=await chromium.launch();
async function mk(width=390,height=844,mode='dark',reducedMotion='reduce'){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion,colorScheme:mode});
  await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
  const page=await ctx.newPage();
  await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
  return {ctx,page};
}
async function go(page,route,wait=1500){await page.goto('http://127.0.0.1:5199'+route,{waitUntil:'domcontentloaded'}).catch(()=>{});await page.waitForTimeout(wait);}
const desc=()=>{const el=document.activeElement;if(!el||el===document.body)return 'BODY';return el.tagName.toLowerCase()+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':'')+(el.getAttribute('placeholder')?'{'+el.getAttribute('placeholder')+'}':'')+(el.tagName!=='INPUT'&&el.textContent?' "'+el.textContent.trim().slice(0,20)+'"':'');};
const out={};
// 1. trip dialog focus return (fixed)
try{const {ctx,page}=await mk();await go(page,'/travel-atlas/trips');
 const trigger=page.locator('button',{hasText:'رحلة جديدة'}).first();await trigger.click();await page.waitForTimeout(600);
 const focusables=await page.evaluate(()=>[...document.querySelectorAll('[role=dialog] button,[role=dialog] input,[role=dialog] textarea,[role=dialog] [tabindex]:not([tabindex="-1"])')].map(el=>({tag:el.tagName.toLowerCase(),ph:el.getAttribute('placeholder'),aria:el.getAttribute('aria-label'),text:(el.textContent||'').trim().slice(0,24),disabled:!!el.disabled})));
 const seq=[];for(let i=0;i<8;i++){await page.keyboard.press('Tab');await page.waitForTimeout(90);seq.push(await page.evaluate(()=>{const el=document.activeElement;if(!el||el===document.body)return 'BODY';return el.tagName.toLowerCase()+(el.getAttribute('placeholder')?'{'+el.getAttribute('placeholder')+'}':'')+((el.tagName!=='INPUT'&&el.textContent)?' "'+el.textContent.trim().slice(0,18)+'"':'');}));}
 await page.keyboard.press('Escape');await page.waitForTimeout(150);const esc150=await page.evaluate(()=>{const el=document.activeElement;return el?el.tagName.toLowerCase()+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':'')+(el.tagName!=='INPUT'&&el.textContent?' "'+el.textContent.trim().slice(0,20)+'"':''):'NULL';});
 await page.waitForTimeout(700);const esc850=await page.evaluate(()=>({active:(()=>{const el=document.activeElement;return el?el.tagName.toLowerCase()+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':''):'NULL';})(),dialog:!!document.querySelector('[role=dialog]'),bodyOverflow:getComputedStyle(document.body).overflow}));
 await trigger.click();await page.waitForTimeout(500);await page.locator('[role=dialog] button',{hasText:'إلغاء'}).first().click().catch(()=>{});await page.waitForTimeout(800);
 const afterCancel=await page.evaluate(()=>({active:(()=>{const el=document.activeElement;return el?el.tagName.toLowerCase()+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':''):'NULL';})(),dialog:!!document.querySelector('[role=dialog]'),bodyOverflow:getComputedStyle(document.body).overflow}));
 out.tripDialog={focusables,tabSequence:seq,esc150,esc850,afterCancel};await ctx.close();}catch(e){out.tripDialog={error:String(e).slice(0,300)}}
// 2. motion persistence
try{const {ctx,page}=await mk(390,844,'dark','no-preference');await go(page,'/settings/motion',1800);
 const clickSwitch=async()=>{return page.evaluate(()=>{const labels=[...document.querySelectorAll('*')].filter(el=>(el.textContent||'').trim()==='تقليل الحركة'&&el.children.length===0);let node=labels[0];for(let i=0;i<8&&node;i++){const sw=node.querySelector?.('[role=switch],button[aria-checked]');if(sw){sw.click();return true;}node=node.parentElement;}return false;});};
 const before=await page.evaluate(()=>({attr:document.documentElement.getAttribute('data-reduced-motion'),stored:localStorage.getItem('app-motion-preferences-v1')}));
 await clickSwitch();await page.waitForTimeout(500);
 const toggled=await page.evaluate(()=>({attr:document.documentElement.getAttribute('data-reduced-motion'),src:document.documentElement.getAttribute('data-reduced-motion-source'),stored:localStorage.getItem('app-motion-preferences-v1')}));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);
 const reloaded=await page.evaluate(()=>({attr:document.documentElement.getAttribute('data-reduced-motion'),src:document.documentElement.getAttribute('data-reduced-motion-source'),stored:localStorage.getItem('app-motion-preferences-v1')}));
 out.motionPersistence={before,toggled,reloaded};await ctx.close();}catch(e){out.motionPersistence={error:String(e).slice(0,300)}}
// 3. auth explicit keyboard toggle behavior 390 + 1440
async function authProbe(width,height,label){
 const {ctx,page}=await mk(width,height);await go(page,'/auth',1600);
 const initial=await page.evaluate(()=>({kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),active:(document.activeElement?.tagName||null),toggles:[...document.querySelectorAll('button')].filter(b=>/لوحة المفاتيح/.test(b.getAttribute('aria-label')||'')).map(b=>b.getAttribute('aria-label'))}));
 await page.screenshot({path:OUT+'/auth-'+label+'-initial.png',animations:'disabled'});
 let opened=null;
 try{const t=page.locator('button[aria-label="لوحة المفاتيح الذكية"]').first();await t.click({timeout:3000});await page.waitForTimeout(900);
  opened=await page.evaluate(()=>{const panel=document.querySelector('[data-soft-keyboard-panel]');const rects=panel?[panel,...panel.querySelectorAll('*')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>100&&r.height>30):[];const kbTop=rects.length?Math.round(Math.min(...rects.map(r=>r.top))):null;const pw=document.querySelector('input[type=password]');const submit=[...document.querySelectorAll('button')].find(b=>/^دخول$/.test((b.textContent||'').trim()));const r=(el)=>{if(!el)return null;const b=el.getBoundingClientRect();return {y:Math.round(b.y),bottom:Math.round(b.bottom)};};const oc=(el)=>{if(!el)return null;const b=el.getBoundingClientRect();const t=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return t?{inKb:!!t.closest('[data-soft-keyboard-panel]'),tag:t.tagName.toLowerCase()}:null;};return {kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),kbTop,password:r(pw),submit:r(submit),submitOccluded:oc(submit),scrollY:Math.round(scrollY),docScroll:document.documentElement.scrollHeight,active:(document.activeElement?.tagName||null)};});
  await page.screenshot({path:OUT+'/auth-'+label+'-keyboard-open.png',animations:'disabled'});
 }catch(e){opened={error:String(e).slice(0,200)};}
 out['auth_'+label]={initial,opened};await ctx.close();
}
try{await authProbe(390,844,'390');}catch(e){out.auth_390={error:String(e).slice(0,200)}}
try{await authProbe(1440,900,'1440');}catch(e){out.auth_1440={error:String(e).slice(0,200)}}
// 4. contrast spot check /games light "مشاركة"
try{const {ctx,page}=await mk(390,844,'light');await go(page,'/games',1800);
 out.gamesLightShare=await page.evaluate(()=>{
   const els=[...document.querySelectorAll('*')].filter(el=>(el.textContent||'').trim()==='مشاركة'&&el.children.length===0);
   const el=els[0];if(!el)return {found:false};
   const parse=(v)=>{const m=v&&v.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
   const over=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
   const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
   const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05)};
   const cs=getComputedStyle(el);
   let stack=[];let node=el;while(node&&node!==document.documentElement){const s=getComputedStyle(node);const p=parse(s.backgroundColor);if(p&&p.a>0){stack.push(p);if(p.a>=0.999)break;}node=node.parentElement;}
   let bg={r:255,g:255,b:255,a:1};for(let i=stack.length-1;i>=0;i--)bg=over(stack[i],bg);
   const fg=parse(cs.color);const fg2=fg&&fg.a<1?over(fg,bg):fg;
   return {found:true,text:el.textContent.trim(),tag:el.tagName.toLowerCase(),cls:el.className,color:cs.color,bgComputed:cs.backgroundColor,stack:stack.slice(0,4),ratio:fg2?Number(ratio(fg2,bg).toFixed(2)):null,fontSize:cs.fontSize,weight:cs.fontWeight,rect:(()=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})()};
 });
 await page.screenshot({path:OUT+'/games-light.png',animations:'disabled',fullPage:false});await ctx.close();}catch(e){out.gamesLightShare={error:String(e).slice(0,300)}}
// 5. german-club/review current state
try{const {ctx,page}=await mk();await go(page,'/german-club/review',2000);
 out.germanReview=await page.evaluate(()=>({h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),dialog:!!document.querySelector('[role=dialog]'),smallTargets:(()=>{const nodes=[...document.querySelectorAll('a[href],button:not([disabled]),[role=button],input:not([type=hidden])')].filter(el=>{const b=el.getBoundingClientRect();const cs=getComputedStyle(el);return b.width>=2&&b.height>=2&&cs.display!=='none'&&(b.width<44||b.height<44);});return nodes.length;})()}));
 await page.screenshot({path:OUT+'/german-review.png',animations:'disabled'});await ctx.close();}catch(e){out.germanReview={error:String(e).slice(0,200)}}
// 6. grammar loading timing
try{const {ctx,page}=await mk();await page.goto('http://127.0.0.1:5199/german-club/grammar',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(600);const early=await page.evaluate(()=>({text:document.body.innerText.replace(/\s+/g,' ').slice(0,160),cards:[...document.querySelectorAll('[class*=skeleton],[class*=animate-pulse]')].length,scrollHeight:document.documentElement.scrollHeight}));
 await page.waitForTimeout(2000);const late=await page.evaluate(()=>({text:document.body.innerText.replace(/\s+/g,' ').slice(0,160),cards:[...document.querySelectorAll('[class*=skeleton],[class*=animate-pulse]')].length,scrollHeight:document.documentElement.scrollHeight}));
 out.grammarTiming={early,late};await ctx.close();}catch(e){out.grammarTiming={error:String(e).slice(0,200)}}
await browser.close();
fs.writeFileSync(OUT+'/retest2.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
