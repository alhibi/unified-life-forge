import { chromium } from '@playwright/test';
const PROFILE = { 'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true' };
async function measure(browser, path, width, height) {
  const ctx = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1, locale:'ar', timezoneId:'Asia/Riyadh', reducedMotion:'reduce', colorScheme:'dark' });
  await ctx.addInitScript((p)=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)}, PROFILE);
  const page = await ctx.newPage();
  await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
  await page.goto('http://127.0.0.1:5199'+path,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const panel = document.querySelector('[data-soft-keyboard-panel]');
    let kbTop = null, kbBottom = null;
    if (panel) {
      const rects = [panel, ...panel.querySelectorAll('*')].map(el=>el.getBoundingClientRect()).filter(r=>r.width>100&&r.height>30);
      kbTop = Math.min(...rects.map(r=>r.top));
      kbBottom = Math.max(...rects.map(r=>r.bottom));
    }
    const desc=(el)=>el?el.tagName.toLowerCase()+(el.getAttribute('type')?'['+el.getAttribute('type')+']':'')+(el.getAttribute('aria-label')?'{'+el.getAttribute('aria-label')+'}':''):null;
    const pw=document.querySelector('input[type=password]');
    const submit=[...document.querySelectorAll('button[type=submit],button')].find(b=>/^دخول$/.test((b.textContent||'').trim()));
    const close=[...document.querySelectorAll('button')].find(b=>/إغلاق|close/i.test(b.getAttribute('aria-label')||''));
    const r=(el)=>{if(!el)return null;const b=el.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),bottom:Math.round(b.bottom)}};
    const occluded=(el)=>{if(!el)return null;const b=el.getBoundingClientRect();const pts=[[b.x+b.width/2,b.y+b.height/2],[b.x+b.width/2,b.y+4],[b.x+b.width/2,b.bottom-4]];return pts.map(([x,y])=>{const t=document.elementFromPoint(x,y);return t?{tag:t.tagName.toLowerCase(),inKb:!!t.closest('[data-soft-keyboard-panel]'),desc:desc(t)}:null})};
    const keyboardButtons=[...(panel?panel.querySelectorAll('button'):[])].map(b=>{const b2=b.getBoundingClientRect();return {w:Math.round(b2.width),h:Math.round(b2.height),text:(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,20)}});
    return { url:location.pathname, vh:innerHeight, kbOpen:document.documentElement.hasAttribute('data-soft-keyboard-open'), kbTop:kbTop&&Math.round(kbTop), kbBottom:kbBottom&&Math.round(kbBottom), kbHeightVar:getComputedStyle(document.documentElement).getPropertyValue('--soft-keyboard-height'), password:r(pw), submit:r(submit), closeButton:r(close), closeLabel:close?close.getAttribute('aria-label'):null, active:desc(document.activeElement), occlusion:{password:occluded(pw),submit:occluded(submit)}, keyboardButtonCount:keyboardButtons.length, keyboardSmallButtons:keyboardButtons.filter(b=>b.w<44||b.h<44).length, card:r(document.querySelector('form')||document.querySelector('[role=dialog]')) };
  });
  await ctx.close();
  return out;
}
const browser = await chromium.launch();
console.log(JSON.stringify(await measure(browser,'/auth',390,844),null,1));
console.log(JSON.stringify(await measure(browser,'/auth',1440,900),null,1));
await browser.close();
