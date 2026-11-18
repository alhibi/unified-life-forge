import { chromium } from '@playwright/test';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});
await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
const out={};
for (const route of ['/chat/groups','/chat/g/00000000-0000-0000-0000-000000000000','/archive/1','/marginalia','/time-ledger','/mihrab','/mihrab/prayer-guide','/podcasts/1']) {
  const ctx2=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ar',reducedMotion:'reduce',colorScheme:'dark'});
  await ctx2.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
  const p2=await ctx2.newPage();
  await p2.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
  let err=null;const cons=[];p2.on('console',m=>{if(m.type()==='error')cons.push(m.text().slice(0,160));});p2.on('pageerror',e=>{err=String(e).slice(0,160);});
  await p2.goto('http://127.0.0.1:5199'+route,{waitUntil:'domcontentloaded'}).catch(()=>{});
  await p2.waitForTimeout(2500);
  out[route]=await p2.evaluate(()=>{const txt=document.body.innerText||'';return {
    h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim().slice(0,40)),
    errorBoundary:/حدث خطأ غير متوقع/.test(txt),
    rawI18nKey:/[a-z]+\.[a-z]+[A-Z]/.test(txt)?(txt.match(/[a-z]+\.[a-z]+[A-Z][A-Za-z]*/g)||[]).slice(0,3):[],
    rawTypeError:/TypeError|Failed to fetch/.test(txt),
    textSnippet:txt.replace(/\s+/g,' ').trim().slice(0,150),
    tabpanel:(()=>{const el=document.querySelector('[role=tabpanel]');if(!el)return null;const cs=getComputedStyle(el);return {tabindex:el.getAttribute('tabindex'),outline:cs.outlineStyle,boxShadow:cs.boxShadow};})(),
    linkRect:(()=>{const a=[...document.querySelectorAll('a')].find(a=>/إعدادات الصلاة/.test(a.textContent||''));if(!a)return null;const r=a.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};})()
  };});
  out[route].pageErrors=err;out[route].consoleErrors=cons.slice(0,2);
  await ctx2.close();
}
console.log(JSON.stringify(out,null,1));
await browser.close();
