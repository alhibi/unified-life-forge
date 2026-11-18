import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT='verification/design/qa/baseline/spotchecks'; fs.mkdirSync(OUT,{recursive:true});
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
async function ctxPage(width, height, mode='dark') {
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:mode});
  await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
  const page=await ctx.newPage();
  await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
  return {ctx,page};
}
async function go(page,route,wait=1600){await page.goto('http://127.0.0.1:5199'+route,{waitUntil:'domcontentloaded'}).catch(()=>{});await page.waitForTimeout(wait);}
const out={};
// 1 crypto h1 + subtitle
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/crypto');
 out.crypto=await page.evaluate(()=>{const h=document.querySelector('h1');const cs=h?getComputedStyle(h):null;const r=h?.getBoundingClientRect();const sub=[...document.querySelectorAll('span,p,div')].find(e=>/تحديث حي/.test(e.textContent||'')&&(e.children.length<3));return {h1:h?{text:h.textContent,scrollWidth:h.scrollWidth,clientWidth:h.clientWidth,rect:r?{w:Math.round(r.width),h:Math.round(r.height)}:null,whiteSpace:cs.whiteSpace,overflow:cs.overflow,textOverflow:cs.textOverflow,flexShrink:cs.flexShrink}:null,subtitleText:sub?sub.textContent.trim().slice(0,80):null,titleBlock: h?h.parentElement?.className:null};});
 await page.screenshot({path:OUT+'/crypto-top.png',clip:{x:0,y:0,width:390,height:180}});await ctx.close();}catch(e){out.crypto={error:String(e).slice(0,200)}}
// 2 sudoku + chess puzzle cells + h1
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/games/sudoku',2200);
 out.sudoku=await page.evaluate(()=>{const h=document.querySelector('h1');const cells=[...document.querySelectorAll('button.aspect-square')].map(b=>b.getBoundingClientRect());const r=h?.getBoundingClientRect();return {h1:h?{text:h.textContent,scrollWidth:h.scrollWidth,clientWidth:h.clientWidth,rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},visible:!!(r.width&&r.height)}:null,cellCount:cells.length,cellMin:Math.min(...cells.map(c=>Math.round(c.width))),cellMax:Math.max(...cells.map(c=>Math.round(c.width))),headerTexts:[...document.querySelectorAll('header *')].map(e=>e.textContent.trim().slice(0,20)).filter(Boolean).slice(0,8)};});
 await page.screenshot({path:OUT+'/sudoku-top.png',clip:{x:0,y:0,width:390,height:320}});await ctx.close();}catch(e){out.sudoku={error:String(e).slice(0,200)}}
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/games/chess/puzzles',2200);
 out.chessPuzzles=await page.evaluate(()=>{const cells=[...document.querySelectorAll('button.aspect-square')].map(b=>b.getBoundingClientRect());const h=document.querySelector('h1');return {cellCount:cells.length,cellMin:Math.min(...cells.map(c=>Math.round(c.width))),h1:h?{text:h.textContent,rect:(()=>{const r=h.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})()}:null};});
 await ctx.close();}catch(e){out.chessPuzzles={error:String(e).slice(0,200)}}
// 3 memory + grammar h1
for (const route of ['/games/memory','/german-club/grammar']) {
 try{const {ctx,page}=await ctxPage(390,844);await go(page,route,2200);
 out['h1_'+route.replace(/\//g,'_')]=await page.evaluate(()=>{const h=document.querySelector('h1');const r=h?.getBoundingClientRect();return h?{text:h.textContent,scrollWidth:h.scrollWidth,clientWidth:h.clientWidth,rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},className:h.className}:null;});
 await page.screenshot({path:OUT+'/h1-'+route.replace(/[^a-z0-9]+/gi,'_')+'.png',clip:{x:0,y:0,width:390,height:200}});await ctx.close();}catch(e){out['h1_'+route]={error:String(e).slice(0,200)}}
}
// 4 dock overlap on /games and /settings/appearance + /profile size
for (const [route,label] of [['/games','games'],['/settings/appearance','appearance'],['/profile','profile']]) {
 try{const {ctx,page}=await ctxPage(390,844);await go(page,route,route==='/profile'?2500:1800);
 out['dock_'+label]=await page.evaluate(()=>{const dock=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'')==='العودة إلى البوابة');if(!dock)return {found:false};const r=dock.getBoundingClientRect();const cs=getComputedStyle(dock);const cx=r.x+r.width/2,cy=r.y+r.height/2;const top=document.elementFromPoint(cx,cy);const under=[...document.querySelectorAll('button,a.input,button.app-row,button.app-card,input')].filter(el=>{if(el===dock||dock.contains(el))return false;const br=el.getBoundingClientRect();const ix=Math.max(0,Math.min(r.right,br.right)-Math.max(r.left,br.left));const iy=Math.max(0,Math.min(r.bottom,br.bottom)-Math.max(r.top,br.top));return ix>=8&&iy>=8&&ix*iy>=140;}).slice(0,3).map(el=>({tag:el.tagName.toLowerCase(),text:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40),overlapArea:(()=>{const br=el.getBoundingClientRect();const ix=Math.max(0,Math.min(r.right,br.right)-Math.max(r.left,br.left));const iy=Math.max(0,Math.min(r.bottom,br.bottom)-Math.max(r.top,br.top));return Math.round(ix*iy);})()}));const controls=[...document.querySelectorAll('button,a,input')].filter(el=>{const br=el.getBoundingClientRect();const ix=Math.max(0,Math.min(r.right,br.right)-Math.max(r.left,br.left));const iy=Math.max(0,Math.min(r.bottom,br.bottom)-Math.max(r.top,br.top));return ix>=8&&iy>=8&&(ix*iy)>=140;});return {found:true,rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},transform:cs.transform,overlapsUnder:under,totalOverlaps:controls.length,hitAtCenter:top?{tag:top.tagName.toLowerCase(),isDock:top===dock||dock.contains(top)}:null};});
 await ctx.close();}catch(e){out['dock_'+label]={error:String(e).slice(0,200)}}
}
// 5 podcasts/1 h1s, travel-atlas/place/1, dev/material-preview headings
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/podcasts/1',2000);
 out.podcastDetail=await page.evaluate(()=>[...document.querySelectorAll('h1')].map(h=>{const r=h.getBoundingClientRect();return {text:h.textContent,outer:h.outerHTML.slice(0,160),rect:{w:Math.round(r.width),h:Math.round(r.height),y:Math.round(r.y)},visible:!!(r.width&&r.height)};}));
 await ctx.close();}catch(e){out.podcastDetail={error:String(e).slice(0,200)}}
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/travel-atlas/place/1',2000);
 out.placeNotFound=await page.evaluate(()=>({h1:[...document.querySelectorAll('h1')].map(h=>({text:h.textContent,html:h.outerHTML.slice(0,140)})),headings:[...document.querySelectorAll('h2,h3,[role=heading]')].map(h=>h.tagName+':'+h.textContent.trim().slice(0,40)).slice(0,6),titleVisible:(()=>{const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/أطلس الرحلات/.test(e.textContent||''));return els.map(e=>({tag:e.tagName.toLowerCase(),cls:e.className.slice(0,60)})).slice(0,4)})()}));
 await ctx.close();}catch(e){out.placeNotFound={error:String(e).slice(0,200)}}
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/dev/material-preview',2000);
 out.materialPreview=await page.evaluate(()=>({h1:[...document.querySelectorAll('h1')].length,headings:[...document.querySelectorAll('h2,h3,[role=heading]')].map(h=>h.tagName+':'+h.textContent.trim().slice(0,40)).slice(0,5)}));
 await ctx.close();}catch(e){out.materialPreview={error:String(e).slice(0,200)}}
// 6 small links: prayer guide + podcasts + auth small target composition
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/mihrab/prayer-guide',1800);
 out.prayerGuideLink=await page.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(a=>/إعدادات الصلاة/.test(a.textContent||''));if(!a)return null;const r=a.getBoundingClientRect();const cs=getComputedStyle(a);return {text:a.textContent.trim().slice(0,40),rect:{w:Math.round(r.width),h:Math.round(r.height)},display:cs.display,parentTag:a.parentElement?.tagName,inParagraph:!!a.closest('p')};});
 await ctx.close();}catch(e){out.prayerGuideLink={error:String(e).slice(0,200)}}
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/podcasts',1800);
 out.appleLink=await page.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(a=>/Apple Podcasts/.test(a.textContent||''));if(!a)return null;const r=a.getBoundingClientRect();const cs=getComputedStyle(a);return {text:a.textContent.trim().slice(0,40),rect:{w:Math.round(r.width),h:Math.round(r.height)},display:cs.display,parentTag:a.parentElement?.tagName};});
 await ctx.close();}catch(e){out.appleLink={error:String(e).slice(0,200)}}
try{const {ctx,page}=await ctxPage(390,844);await go(page,'/auth',1800);
 out.authSmall=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('a[href],button:not([disabled]),[role=button],input:not([type=hidden]),select,textarea')];const small=nodes.filter(el=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>=2&&r.height>=2&&cs.display!=='none'&&cs.visibility!=='hidden'&&(r.width<44||r.height<44);});const kb=document.querySelector('[data-soft-keyboard-panel]');return {smallCount:small.length,insideKeyboard:small.filter(el=>kb&&kb.contains(el)).length,outside:small.filter(el=>!(kb&&kb.contains(el))).map(el=>({tag:el.tagName.toLowerCase(),text:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,30),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)})).slice(0,10),keyboardOpen:!!kb};});
 await ctx.close();}catch(e){out.authSmall={error:String(e).slice(0,200)}}
await browser.close();
fs.writeFileSync(OUT+'/spotchecks.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
