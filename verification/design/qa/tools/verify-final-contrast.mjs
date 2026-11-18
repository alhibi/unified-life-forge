import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT='verification/design/qa/final/contrast-verify'; fs.mkdirSync(OUT,{recursive:true});
const PROFILE={'app-theme':'dark','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'};
const browser=await chromium.launch();
const PARSE=(v)=>{const m=v&&v.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
async function ctxMode(mode){const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:mode});await ctx.addInitScript(({p,mode})=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v);localStorage.setItem('app-theme',mode);},{p:PROFILE,mode});const page=await ctx.newPage();await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});return {ctx,page};}
const CASES=[
 {route:'/chat',mode:'dark',text:'استكشف دون حساب'},
 {route:'/chat',mode:'light',text:'استكشف دون حساب'},
 {route:'/browse',mode:'dark',text:'مقالات ومصادر ومحفوظات'},
 {route:'/occasions',mode:'dark',text:'مناسبة'},
 {route:'/occasions',mode:'light',text:'مناسبة'},
 {route:'/occasions',mode:'dark',text:'10'},
 {route:'/games/memory',mode:'dark',text:'الخطوة الأولى'},
 {route:'/games/chess/puzzles',mode:'dark',text:'التالي'},
 {route:'/games',mode:'light',text:'بلا رتبة'},
 {route:'/games',mode:'light',text:'مشاركة'},
 {route:'/chat/g/00000000-0000-0000-0000-000000000000',mode:'dark',text:'العودة إلى البوابة'},
];
const out=[];
for(const c of CASES){
  const {ctx,page}=await ctxMode(c.mode);
  await page.goto('http://127.0.0.1:5199'+c.route,{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.waitForTimeout(2200);
  const data=await page.evaluate(({text})=>{
    const parse=(v)=>{const m=v&&v.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
    const over=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
    const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
    const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return Number(((Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05)).toFixed(2))};
    const cands=[...document.querySelectorAll('span,button,p,div,a')].filter(el=>(el.textContent||'').trim()===text&&el.children.length===0);
    const el=cands[0]; if(!el) return {found:false};
    const cs=getComputedStyle(el);
    // collect backgrounds + ancestor opacity + gradient + disabled
    let node=el, stack=[], ancestorOpacity=1, gradient=false, disabled=false, dimmedBy=null;
    while(node&&node!==document.documentElement){
      const s=getComputedStyle(node);
      if(s.backgroundImage!=='none') gradient=true;
      const op=Number(s.opacity); if(node!==el && op<1){ancestorOpacity*=op; dimmedBy=node.tagName.toLowerCase()+'.'+(typeof node.className==='string'?node.className:'').split(/\s+/).slice(0,2).join('.');}
      const p=parse(s.backgroundColor); if(p&&p.a>0){stack.push(p); if(p.a>=0.999)break;}
      if(node.hasAttribute?.('disabled')||node.getAttribute?.('aria-disabled')==='true') disabled=true;
      node=node.parentElement;
    }
    const bodyBg=parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};
    let bg=bodyBg; for(let i=stack.length-1;i>=0;i--)bg=over(stack[i],bg);
    const fg=parse(cs.color); const fgEff=over({...fg,a:fg.a*ancestorOpacity},bg);
    const elOpacity=Number(cs.opacity);
    return {found:true, text, tag:el.tagName.toLowerCase(), cls:el.className.slice(0,120), color:cs.color, bg:[Math.round(bg.r),Math.round(bg.g),Math.round(bg.b)], stack:stack.slice(0,4), ratioNoOpacity:fg?ratio(over(fg,bg),bg):null, ratioEffective:ratio(fgEff,bg), ancestorOpacity:Number(ancestorOpacity.toFixed(2)), dimmedBy, gradient, disabled, elOpacity, fontSize:cs.fontSize, weight:cs.fontWeight, rect:(()=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y)};})()};
  },{text:c.text});
  out.push({...c,...data});
  await ctx.close();
}
await browser.close();
fs.writeFileSync(OUT+'/contrast-verify.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
