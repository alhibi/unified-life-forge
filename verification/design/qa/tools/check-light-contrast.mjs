import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT='verification/design/qa/baseline/retest2'; fs.mkdirSync(OUT,{recursive:true});
const ctx=await chromium.launch().then(b=>b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',timezoneId:'Asia/Riyadh',reducedMotion:'reduce',colorScheme:'light'}));
await ctx.addInitScript(()=>{for(const[k,v]of Object.entries({'app-theme':'light','app-color-theme':'expressive','app-palette-style':'tonal','app-black-mode':'false','app-surface-lift':'subtle','app-ui-density':'cozy','app-content-width':'standard','app-reduced-motion':'true'}))localStorage.setItem(k,v);});
const page=await ctx.newPage();
await page.route('**/*',(r)=>{const h=new URL(r.request().url()).hostname;if(h==='127.0.0.1'||h==='localhost'||h.endsWith('googleapis.com')||h.endsWith('gstatic.com'))return r.continue();return r.abort();});
await page.goto('http://127.0.0.1:5199/games',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);
const data=await page.evaluate(()=>{
 const parse=(v)=>{const m=v&&v.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
 const over=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
 const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
 const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05)};
 const bgOf=(el)=>{let stack=[];let node=el;while(node&&node!==document.documentElement){const s=getComputedStyle(node);const p=parse(s.backgroundColor);if(p&&p.a>0){stack.push(p);if(p.a>=0.999)break;}node=node.parentElement;}let bg=parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};for(let i=stack.length-1;i>=0;i--)bg=over(stack[i],bg);return bg;};
 const out=[];
 for (const text of ['بلا رتبة','مشاركة']) {
   const el=[...document.querySelectorAll('span')].find(e=>e.textContent.trim()===text);
   if(!el){out.push({text,found:false});continue;}
   const cs=getComputedStyle(el);const fg=parse(cs.color);const bg=bgOf(el);
   const fg2=fg.a<1?over(fg,bg):fg;
   out.push({text,found:true,color:cs.color,bg:[Math.round(bg.r),Math.round(bg.g),Math.round(bg.b)],ratio:Number(ratio(fg2,bg).toFixed(2)),fontSize:cs.fontSize,weight:cs.fontWeight,rect:(()=>{const r=el.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})()});
 }
 return {theme:document.documentElement.getAttribute('data-theme')||getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),htmlClass:document.documentElement.className,out,share:out};
});
await page.screenshot({path:OUT+'/games-light-actual.png',animations:'disabled',fullPage:true});
console.log(JSON.stringify(data,null,1));
await ctx.close();
