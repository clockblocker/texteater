import {build} from "esbuild";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {resolve,join} from "node:path";
import {pathToFileURL} from "node:url";
const dir=import.meta.dir,root=resolve(dir,"../../../..");
const dist=join(dir,"dist");mkdirSync(dist,{recursive:true});
const subset=process.argv.includes("--actual-only")?"actual":process.argv.includes("--toy-only")?"toy":"all";
const sampleCount=Number(process.env.BENCH_SAMPLES??5);
if(sampleCount%2!==1)throw Error("Use an odd number of samples");
const scenarios:{id:string;size:number;actual:boolean;entry:string}[]=[];
if(subset!=="actual")for(const size of [100,1000])for(const library of ["zod","valibot","arktype","arri"])scenarios.push({id:`${library}-${size}`,size,actual:false,entry:join(dir,"generated",`${library}-${size}`,"model.ts")});
if(subset!=="toy")for(const [id,file]of [["actual-zod","direct.ts"],["actual-compiled","index.ts"]])scenarios.push({id,size:100,actual:true,entry:join(dir,"../compiled-zod",file)});
await build({entryPoints:[join(dir,"runtime-runner.ts")],outfile:join(dist,"runner.mjs"),bundle:true,format:"esm",platform:"node",target:"node24",logLevel:"silent"});
const bundleInfo=[];
for(const s of scenarios){
 const output=join(dist,s.id+".mjs");
 const r=await build({entryPoints:[s.entry],outfile:output,bundle:true,format:"esm",platform:"node",target:"node24",metafile:true,logLevel:"silent"});
 bundleInfo.push({id:s.id,bytes:readFileSync(output).length,modules:Object.keys(r.metafile!.inputs).length});
}
const med=(numbers:number[])=>[...numbers].sort((a,b)=>a-b)[Math.floor(numbers.length/2)]!;
const results:any[]=[];
const outputFile=join(dir,`runtime-${subset}.json`);
const env={...process.env};delete env.BUN_INSPECT;delete env.BUN_INSPECT_CONNECT_TO;delete env.BUN_INSPECT_NOTIFY;
for(const [runtime,exe]of [["bun",process.execPath],["node",join(root,"node_modules/node/bin/node")]]){
 for(const s of [{id:"baseline",size:0,actual:false},...scenarios])for(const mode of s.id==="baseline"?["baseline"]:["import","cold","all","warm"]){
  const samples=[];
  for(let n=0;n<sampleCount;n++){
   const p=Bun.spawn([exe,join(dist,"runner.mjs"),pathToFileURL(join(dist,s.id+".mjs")).href,mode,String(s.size),s.actual?"actual":"toy"],{env,stdout:"pipe",stderr:"pipe"});
   const timeout=setTimeout(()=>p.kill(),60000);
   const [stdout,stderr,code]=await Promise.all([new Response(p.stdout).text(),new Response(p.stderr).text(),p.exited]);clearTimeout(timeout);
   if(code)throw Error(`${runtime} ${s.id} ${mode}: ${stderr||stdout}`);
   samples.push(JSON.parse(stdout));
  }
  const row={runtime,scenario:s.id,mode,peakBytes:med(samples.map(x=>x.peakBytes)),rssBytes:med(samples.map(x=>x.rssBytes)),loadMs:med(samples.map(x=>x.loadMs)),operationMs:med(samples.map(x=>x.operationMs)),iterations:samples[0].iterations,samples};results.push(row);
  const base=results.find(r=>r.runtime===runtime&&r.scenario==="baseline");
  console.log(runtime,s.id,mode,"peak delta MiB",((row.peakBytes-base.peakBytes)/1048576).toFixed(3),"load ms",row.loadMs.toFixed(2),"op ms",row.operationMs.toFixed(2));
  writeFileSync(outputFile,JSON.stringify({environment:{capturedAt:new Date().toISOString(),bun:Bun.version,node:"24.19.0",platform:process.platform,arch:process.arch,sampleCount,metric:"median fresh-process peak RSS; maxRSS KiB converted to bytes",dependencies:JSON.parse(readFileSync(join(dir,"../package.json"),"utf8")).dependencies},bundleInfo,results},null,2)+"\n");
 }
}
console.log("Wrote",outputFile);
