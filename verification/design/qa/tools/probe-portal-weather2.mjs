import { chromium } from '@playwright/test';
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'dark'});
await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},PROFILE);
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
await page.goto('http://127.0.0.1:5199/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2500);
const res=await page.evaluate(()=>{
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const hits=[];
  for(let n=walker.nextNode();n;n=walker.nextNode()){
    const t=(n.textContent||'').trim();
    if(!/0°|0 ?%|0 ?hPa|0 ?m\/s|0 ?كم\/س/.test(t)) continue;
    const el=n.parentElement;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);
    hits.push({text:t.slice(0,60),tag:el.tagName.toLowerCase(),cls:(typeof el.className==='string'?el.className:'').slice(0,80),rect:{y:Math.round(r.y),h:Math.round(r.height),w:Math.round(r.width)},visible:r.width>2&&r.height>2&&cs.display!=='none'&&cs.visibility!=='hidden',ancestorWeather:!!el.closest('[data-weather-widget], [class*=weather], [aria-label*=الطقس]')});
  }
  // weather plate context: find the element whose text starts with الطقس and contains no-location prompt
  const plates=[...document.querySelectorAll('*')].filter(el=>{const t=(el.textContent||'').replace(/\s+/g,' ').trim();return t.startsWith('الطقس')&&t.length<300&&el.getBoundingClientRect().width>100;}).slice(0,3).map(el=>({tag:el.tagName.toLowerCase(),text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,260),cls:(typeof el.className==='string'?el.className:'').slice(0,100),html:el.outerHTML.slice(0,400)}));
  return {hits:hits.slice(0,8),plates};
});
console.log(JSON.stringify(res,null,1));
await ctx.close();await browser.close();
