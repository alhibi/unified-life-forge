import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT='verification/design/qa/baseline/retest'; fs.mkdirSync(OUT,{recursive:true});
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'false'};
const browser=await chromium.launch();
async function mk(width=390,height=844,reducedMotion='reduce'){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion,colorScheme:'dark'});
  await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
  const page=await ctx.newPage();
  await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
  return {ctx,page};
}
async function go(page,route,wait=1500){await page.goto('http://127.0.0.1:5199'+route,{waitUntil:'domcontentloaded'}).catch(()=>{});await page.waitForTimeout(wait);}
const ident=()=>{const el=document.activeElement;if(!el||el===document.body)return 'body';return el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.getAttribute('name')?'[name='+el.getAttribute('name')+']':'')+(el.getAttribute('placeholder')?'{'+el.getAttribute('placeholder').slice(0,18)+'}':'')+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label').slice(0,18)+'}':'')+(el.textContent&&el.tagName!=='INPUT'?' "'+el.textContent.trim().slice(0,16)+'"':'');};
const out={};
// A. trip dialog focus trap + return
try{const {ctx,page}=await mk();await go(page,'/travel-atlas/trips');
 const trigger=page.locator('button',{hasText:'رحلة جديدة'}).first();await trigger.click();await page.waitForTimeout(600);
 const open=await page.evaluate(()=>({dialog:!!document.querySelector('[role=dialog]'),active:(()=>{const el=document.activeElement;return el?el.tagName.toLowerCase():'?'})(),bodyOverflow:getComputedStyle(document.body).overflow,pointer:getComputedStyle(document.body).pointerEvents}));
 const focusables=await page.evaluate(()=>[...document.querySelectorAll('[role=dialog] button,[role=dialog] input,[role=dialog] textarea,[role=dialog] [tabindex]:not([tabindex="-1"])')].map(el=>({tag:el.tagName.toLowerCase(),ph:el.getAttribute('placeholder'),label:el.getAttribute('aria-label'),text:(el.textContent||'').trim().slice(0,20),disabled:el.disabled})));
 const seq=[];for(let i=0;i<8;i++){await page.keyboard.press('Tab');await page.waitForTimeout(80);seq.push(await page.evaluate(()=>{const el=document.activeElement;if(!el)return 'none';return el.tagName.toLowerCase()+(el.getAttribute('placeholder')?'{'+el.getAttribute('placeholder').slice(0,20)+'}':'')+(el.textContent&&el.tagName!=='INPUT'?' "'+el.textContent.trim().slice(0,18)+'"':'');}));}
 await page.keyboard.press('Escape');await page.waitForTimeout(120);const afterEsc120=await page.evaluate(()=>{const el=document.activeElement;return el?el.tagName.toLowerCase()+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':'')+(el.textContent?' "'+el.textContent.trim().slice(0,20)+'"':''):'null';});
 await page.waitForTimeout(600);const afterEsc700=await page.evaluate(()=>({active:(()=>{const el=document.activeElement;return el?el.tagName.toLowerCase()+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':''):'null';})(),dialog:!!document.querySelector('[role=dialog]'),bodyOverflow:getComputedStyle(document.body).overflow}));
 // reopen and close via cancel button
 await trigger.click();await page.waitForTimeout(500);document.title;
 const cancel=page.locator('[role=dialog] button',{hasText:'إلغاء'}).first();await cancel.click().catch(()=>{});await page.waitForTimeout(700);
 const afterCancel=await page.evaluate(()=>({active:(()=>{const el=document.activeElement;return el?el.tagName.toLowerCase()+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':'')+(el.textContent?' "'+el.textContent.trim().slice(0,20)+'"':''):'null';})(),dialog:!!document.querySelector('[role=dialog]'),bodyOverflow:getComputedStyle(document.body).overflow}));
 out.tripDialog={open,focusables,tabSequence:seq,afterEsc120,afterEsc700,afterCancel};await ctx.close();}catch(e){out.tripDialog={error:String(e).slice(0,300)}}
// B. german dictionary modal
try{const {ctx,page}=await mk();await go(page,'/german-club/dictionary');
 const card=page.locator('[role=button]',{hasText:'Systematische Entwicklung'}).first();
 await card.click({timeout:5000}).catch((e)=>{out.germanClickError=String(e).slice(0,160);});
 await page.waitForTimeout(700);
 const open=await page.evaluate(()=>({dialog:document.querySelector('[role=dialog]')?{title:(document.querySelector('[role=dialog]')?.textContent||'').trim().slice(0,50),rect:(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})()}:null,active:(document.activeElement?.tagName||'?'),bodyOverflow:getComputedStyle(document.body).overflow}));
 await page.screenshot({path:OUT+'/german-dict-modal.png',animations:'disabled'});
 await page.keyboard.press('Escape');await page.waitForTimeout(600);
 const after=await page.evaluate(()=>({dialog:!!document.querySelector('[role=dialog]'),active:(document.activeElement?.tagName||'?')+(document.activeElement?.textContent?' "'+document.activeElement.textContent.trim().slice(0,25)+'"':''),bodyOverflow:getComputedStyle(document.body).overflow}));
 out.germanModal={open,after};await ctx.close();}catch(e){out.germanModal={error:String(e).slice(0,300)}}
// C. motion switch toggle
async function motionTest(reducedMotion){const {ctx,page}=await mk(390,844,reducedMotion);await go(page,'/settings/motion',1800);
 const before=await page.evaluate(()=>({attr:document.documentElement.getAttribute('data-reduced-motion'),src:document.documentElement.getAttribute('data-reduced-motion-source'),stored:localStorage.getItem('app-reduced-motion'),os:matchMedia('(prefers-reduced-motion: reduce)').matches,td:getComputedStyle(document.querySelector('button.app-pressable')||document.body).transitionDuration}));
 const clicked=await page.evaluate(()=>{const labels=[...document.querySelectorAll('*')].filter(el=>(el.textContent||'').trim()==='تقليل الحركة'&&el.children.length===0);if(!labels.length)return {err:'label missing'};let node=labels[0];for(let i=0;i<6&&node;i++){const sw=node.querySelector?.('[role=switch],button[aria-checked]');if(sw){sw.click();return {ok:true,checkedBefore:sw.getAttribute('aria-checked')};}node=node.parentElement;}return {err:'switch missing'};});
 await page.waitForTimeout(600);
 const after=await page.evaluate(()=>({attr:document.documentElement.getAttribute('data-reduced-motion'),src:document.documentElement.getAttribute('data-reduced-motion-source'),stored:localStorage.getItem('app-reduced-motion'),td:getComputedStyle(document.querySelector('button.app-pressable')||document.body).transitionDuration}));
 await page.screenshot({path:OUT+'/motion-toggle-'+(reducedMotion==='reduce'?'osreduce':'osnone')+'.png',animations:'disabled'});
 // toggle back
 await page.evaluate(()=>{const labels=[...document.querySelectorAll('*')].filter(el=>(el.textContent||'').trim()==='تقليل الحركة'&&el.children.length===0);let node=labels[0];for(let i=0;i<6&&node;i++){const sw=node.querySelector?.('[role=switch],button[aria-checked]');if(sw){sw.click();return;}node=node.parentElement;}});
 await ctx.close();return {reducedMotion,before,clicked,after};}
try{out.motionOsNone=await motionTest('no-preference');}catch(e){out.motionOsNone={error:String(e).slice(0,300)}}
try{out.motionOsReduce=await motionTest('reduce');}catch(e){out.motionOsReduce={error:String(e).slice(0,300)}}
// D. mihrab tabpanel focus ring + screenshot
try{const {ctx,page}=await mk();await go(page,'/mihrab',1800);
 const panel=page.locator('[role=tabpanel]').first();await panel.focus().catch(()=>{});
 const ring=await page.evaluate(()=>{const el=document.querySelector('[role=tabpanel]');const cs=el?getComputedStyle(el):null;return el?{tabindex:el.getAttribute('tabindex'),focusVisible:el.matches(':focus-visible'),outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor,boxShadow:cs.boxShadow}:null;});
 await page.screenshot({path:OUT+'/mihrab-tabpanel-focus.png',animations:'disabled',clip:{x:0,y:300,width:390,height:300}});
 out.mihrabTabpanel=ring;await ctx.close();}catch(e){out.mihrabTabpanel={error:String(e).slice(0,300)}}
// E. dock after scroll on /games and /settings/motion
for(const route of ['/games','/settings/motion','/diwan']){
 try{const {ctx,page}=await mk();await go(page,route,1800);
 await page.evaluate(()=>window.scrollTo(0,900));await page.waitForTimeout(700);
 const dock=await page.evaluate(()=>{const d=document.querySelector('.portal-dock');if(!d)return {found:false,dataAttr:document.documentElement.getAttribute('data-portal-dock')};const r=d.getBoundingClientRect();const cs=getComputedStyle(d);const overlaps=[...document.querySelectorAll('button,a,input')].filter(el=>{if(el===d||d.contains(el))return false;const br=el.getBoundingClientRect();const ix=Math.max(0,Math.min(r.right,br.right)-Math.max(r.left,br.left));const iy=Math.max(0,Math.min(r.bottom,br.bottom)-Math.max(r.top,br.top));return ix>=8&&iy>=8&&ix*iy>=140;}).slice(0,3).map(el=>((el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40)));return {found:true,rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},opacity:cs.opacity,dataAttr:document.documentElement.getAttribute('data-portal-dock'),overlaps};});
 await page.screenshot({path:OUT+'/dock-'+route.replace(/[^a-z0-9]+/gi,'_')+'-scrolled.png',animations:'disabled'});
 out['dock_'+route]=dock;await ctx.close();}catch(e){out['dock_'+route]={error:String(e).slice(0,200)}}
}
// F. auth current keyboard state + occlusion
try{const {ctx,page}=await mk();await go(page,'/auth',1600);
 out.authNow=await page.evaluate(()=>{const panel=document.querySelector('[data-soft-keyboard-panel]');const rects=panel?[panel,...panel.querySelectorAll('*')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>100&&r.height>30):[];const kbTop=rects.length?Math.round(Math.min(...rects.map(r=>r.top))):null;const pw=document.querySelector('input[type=password]');const submit=[...document.querySelectorAll('button')].find(b=>/^دخول$/.test((b.textContent||'').trim()));const r=(el)=>{if(!el)return null;const b=el.getBoundingClientRect();return {y:Math.round(b.y),bottom:Math.round(b.bottom),h:Math.round(b.height)}};const oc=(el)=>{if(!el)return null;const b=el.getBoundingClientRect();const t=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return t?{inKb:!!t.closest('[data-soft-keyboard-panel]'),tag:t.tagName.toLowerCase()}:null;};return {kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'),kbTop,password:r(pw),submit:r(submit),submitOccluded:oc(submit),passwordOccluded:oc(pw),active:(document.activeElement?.tagName||null),smallTargets:(()=>{const nodes=[...document.querySelectorAll('a[href],button:not([disabled]),[role=button],input:not([type=hidden])')].filter(el=>{const b=el.getBoundingClientRect();const cs=getComputedStyle(el);return b.width>=2&&b.height>=2&&cs.display!=='none'&&(b.width<44||b.height<44);});const kb=document.querySelector('[data-soft-keyboard-panel]');return {total:nodes.length,inKb:nodes.filter(el=>kb&&kb.contains(el)).length,outKb:nodes.filter(el=>!(kb&&kb.contains(el))).map(el=>({tag:el.tagName.toLowerCase(),text:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,24),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)})).slice(0,8)};})()};});
 await page.screenshot({path:OUT+'/auth-now.png',animations:'disabled'});await ctx.close();}catch(e){out.authNow={error:String(e).slice(0,200)}}
await browser.close();
fs.writeFileSync(OUT+'/retest.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
