import fs from 'node:fs';
const G=JSON.parse(fs.readFileSync('.audit/graph.json','utf8'));
const E=G.edges;
const kind=f=>{
  if(/^src\/features\/[^/]+\/(api|.*\/api)\.ts$/.test(f)) return 'api';
  if(/^src\/features\/[^/]+\/(pages|ui\/pages)\//.test(f)) return 'page';
  if(/^src\/features\/[^/]+\/components\//.test(f)) return 'component';
  if(/^src\/(pages)\//.test(f)) return 'page';
  if(/^src\/components\/ui\//.test(f)) return 'ui-primitive';
  if(/^src\/components\//.test(f)) return 'component';
  if(/^src\/hooks\//.test(f)) return 'hook';
  if(/^src\/contexts\//.test(f)) return 'context';
  if(/^src\/lib\//.test(f)) return 'lib';
  if(/^src\/utils\//.test(f)) return 'util';
  return 'other';
};
/* AGENTS.md §: "no raw Supabase client usage outside feature api.ts" */
const SB='src/integrations/supabase/client.ts', SBU='src/integrations/supabase/untypedClient.ts';
const violators=[];
for(const [f,ds] of Object.entries(E)){
  if(f.startsWith('src/integrations/')) continue;
  if(ds.includes(SB)||ds.includes(SBU)){
    const k=kind(f);
    if(k!=='api') violators.push([k,f]);
  }
}
const byKind={}; violators.forEach(([k])=>byKind[k]=(byKind[k]||0)+1);
console.log('### RULE: "no raw Supabase outside feature api.ts"  (AGENTS.md)');
console.log('total direct importers of the supabase client:',violators.length+Object.keys(E).filter(f=>(E[f]||[]).includes(SB)&&kind(f)==='api').length);
console.log('VIOLATIONS:',violators.length,'| by layer:',JSON.stringify(byKind));
console.log('compliant (feature api.ts):',Object.keys(E).filter(f=>(E[f]||[]).includes(SB)&&kind(f)==='api').length);
['page','component','hook','context','lib','util','ui-primitive','other'].forEach(k=>{
  const v=violators.filter(x=>x[0]===k).map(x=>x[1]);
  if(v.length) console.log(`\n  -- ${k} (${v.length}) --\n`+v.slice(0,10).map(x=>'     '+x).join('\n')+(v.length>10?`\n     … +${v.length-10}`:''));
});

/* localStorage sprawl by layer */
console.log('\n### localStorage direct access by layer');
const ls={};
for(const f of G.prod){ const n=(fs.readFileSync(f,'utf8').match(/localStorage\./g)||[]).length;
  if(n) { const k=kind(f); ls[k]=(ls[k]||0)+n; } }
console.log(JSON.stringify(ls,null,1));

/* which layers import which */
console.log('\n### LAYER DEPENDENCY MATRIX (import statements)');
const m={};
for(const [f,ds] of Object.entries(E)){ const a=kind(f);
  for(const d of ds){ const b=kind(d); if(a===b) continue; m[a+' → '+b]=(m[a+' → '+b]||0)+1; } }
Object.entries(m).sort((x,y)=>y[1]-x[1]).slice(0,22).forEach(([k,v])=>console.log(`  ${String(v).padStart(4)}  ${k}`));
