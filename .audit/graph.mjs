import fs from 'node:fs'; import path from 'node:path';
const ROOT='src';
const files=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory()){if(!/^(__tests__|__mocks__)$/.test(e.name)) w(p);}
 else if(/\.(ts|tsx)$/.test(e.name)) files.push(p);}})(ROOT);
const isTest=f=>/\.(test|spec)\.tsx?$/.test(f)||f.includes('__tests__')||f.startsWith('src/test/');
const prod=files.filter(f=>!isTest(f));
const SET=new Set(files);
function resolve(from,spec){
  let base;
  if(spec.startsWith('@/')) base=path.join('src',spec.slice(2));
  else if(spec.startsWith('./')||spec.startsWith('../')) base=path.normalize(path.join(path.dirname(from),spec));
  else return null;
  const cands=[base,base+'.ts',base+'.tsx',base+'/index.ts',base+'/index.tsx',base+'.d.ts'];
  for(const c of cands) if(SET.has(c)) return c;
  return null;
}
const edges=new Map();     // file -> Set(file)
const rdeps=new Map();     // file -> Set(file)
const external=new Map();  // pkg -> count
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  const out=new Set();
  const specs=[...src.matchAll(/(?:from\s*|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
  for(const s of specs){
    const r=resolve(f,s);
    if(r){ out.add(r); if(!rdeps.has(r)) rdeps.set(r,new Set()); rdeps.get(r).add(f); }
    else if(!s.startsWith('.')&&!s.startsWith('@/')){
      const pkg=s.startsWith('@')?s.split('/').slice(0,2).join('/'):s.split('/')[0];
      external.set(pkg,(external.get(pkg)||0)+1);
    }
  }
  edges.set(f,out);
}
fs.writeFileSync('.audit/graph.json',JSON.stringify({
  files, prod,
  edges:Object.fromEntries([...edges].map(([k,v])=>[k,[...v]])),
  rdeps:Object.fromEntries([...rdeps].map(([k,v])=>[k,[...v]])),
  external:Object.fromEntries(external),
},null,0));
console.log('files',files.length,'prod',prod.length,'external pkgs',external.size);
