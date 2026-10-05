import fs from 'node:fs';
const G=JSON.parse(fs.readFileSync('.audit/graph.json','utf8'));
const E=G.edges, R=G.rdeps;
const seg=f=>{ const p=f.split('/');
  if(p[1]==='features') return 'feature:'+p[2];
  return 'layer:'+(p[1]||'root'); };

/* ---------- 1. CYCLES (Tarjan SCC) ---------- */
let idx=0; const I={},L={},on={},st=[],sccs=[];
function sc(v){ I[v]=L[v]=idx++; st.push(v); on[v]=1;
  for(const w of (E[v]||[])){ if(I[w]===undefined){sc(w);L[v]=Math.min(L[v],L[w]);} else if(on[w]) L[v]=Math.min(L[v],I[w]); }
  if(L[v]===I[v]){ const c=[]; let w; do{ w=st.pop(); on[w]=0; c.push(w);}while(w!==v); if(c.length>1) sccs.push(c); } }
for(const v of Object.keys(E)) if(I[v]===undefined) sc(v);
// self loops + 2-cycles
const two=[]; for(const [a,ds] of Object.entries(E)) for(const b of ds) if(a<b && (E[b]||[]).includes(a)) two.push([a,b]);
console.log('### CYCLES');
console.log('SCCs (>1 file):',sccs.length);
sccs.sort((a,b)=>b.length-a.length).slice(0,6).forEach(c=>console.log('  size',c.length,'::',c.slice(0,6).join(' ⇄ ')));
console.log('direct 2-file cycles:',two.length);
two.slice(0,12).forEach(([a,b])=>console.log('  ',a,'⇄',b));

/* ---------- 2. CROSS-FEATURE COUPLING ---------- */
const cross=new Map(); const crossEx=new Map();
for(const [f,ds] of Object.entries(E)){
  const sf=seg(f); if(!sf.startsWith('feature:')) continue;
  for(const d of ds){ const sd=seg(d);
    if(sd.startsWith('feature:')&&sd!==sf){ const k=sf+' → '+sd;
      cross.set(k,(cross.get(k)||0)+1);
      if(!crossEx.has(k)) crossEx.set(k,[]); if(crossEx.get(k).length<2) crossEx.get(k).push(f+'  ⇒  '+d); } } }
console.log('\n### CROSS-FEATURE IMPORTS (boundary violations under FSD)');
console.log('distinct feature→feature edges:',cross.size,'| total import statements:',[...cross.values()].reduce((a,b)=>a+b,0));
[...cross].sort((a,b)=>b[1]-a[1]).slice(0,18).forEach(([k,n])=>console.log(`  ${String(n).padStart(3)}  ${k}`));

/* ---------- 3. GOD FILES: size + fan-in + fan-out ---------- */
const rows=G.prod.map(f=>({f,
  loc:fs.readFileSync(f,'utf8').split('\n').length,
  out:(E[f]||[]).length, in:(R[f]||[]).length}));
console.log('\n### LARGEST FILES (LOC)');
rows.sort((a,b)=>b.loc-a.loc).slice(0,15).forEach(r=>console.log(`  ${String(r.loc).padStart(6)} loc  fan-in ${String(r.in).padStart(3)}  fan-out ${String(r.out).padStart(3)}  ${r.f}`));
console.log('\n### HIGHEST FAN-IN (blast radius: direct consumers)');
rows.sort((a,b)=>b.in-a.in).slice(0,20).forEach(r=>console.log(`  ${String(r.in).padStart(4)} consumers  ${String(r.loc).padStart(5)} loc  ${r.f}`));
console.log('\n### HIGHEST FAN-OUT (god orchestrators)');
rows.sort((a,b)=>b.out-a.out).slice(0,12).forEach(r=>console.log(`  ${String(r.out).padStart(4)} deps  ${String(r.loc).padStart(5)} loc  ${r.f}`));
