import {sample,unitKinds} from "./fixtures.ts";
import actualSamples from "../compiled-zod/fixtures.json" with {type:"json"};
const [target,mode,rawSize,actual]=process.argv.slice(2);
const size=Number(rawSize);
const sourceSample=(i=0,u="Surface")=>actual==="actual"?actualSamples[i%actualSamples.length]:sample(i,u);
const t0=performance.now();
let mod:any;
let loadMs=0,operationMs=0,iterations=0;
if(mode!=="baseline"){
 mod=await import(target!);loadMs=performance.now()-t0;
 const run=(value:unknown)=>{const result=mod.parseUnit(value);if(!result.success)throw Error(JSON.stringify(result));return result;};
 const start=performance.now();
 if(mode==="cold")run(sourceSample());
 if(mode==="all")for(let i=0;i<size;i++)for(const u of actual==="actual"?["Lemma"]:unitKinds)run(sourceSample(i,u));
 if(mode==="warm"){
  const value=sourceSample();for(let i=0;i<2000;i++)run(value);
  const started=performance.now();iterations=20000;
  for(let i=0;i<iterations;i++)run(value);
  operationMs=performance.now()-started;
 }else operationMs=performance.now()-start;
}
(globalThis as any).__retained=mod;
console.log(JSON.stringify({peakBytes:process.resourceUsage().maxRSS*1024,rssBytes:process.memoryUsage().rss,heapBytes:process.memoryUsage().heapUsed,loadMs,operationMs,iterations}));
