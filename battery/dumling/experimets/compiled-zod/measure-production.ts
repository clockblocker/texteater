import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const packageRoot=resolve(import.meta.dir,"../..");
const runner=join(import.meta.dir,"production-runner.mjs");
writeFileSync(runner,`
const mode=process.argv[2];
const lemma={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Haus",coreFeatures:{gender:"Neut",hyph:null}};
const surface={unitKind:"Surface",language:"de",lemma,normalizedSurface:"Häuser",spelling:"Canonical",surfaceFeatures:null,inflectionalFeatures:{case:"Nom",number:"Plur"}};
const values={lemma,surface,reading:{unitKind:"Reading",lemma,emojiDescription:"🏠"},attestation:{unitKind:"Attestation",surface,members:[{attested:"Häuser",orthography:"Standard"}],realizationCoverage:"Full"}};
let module;
if(mode!=="baseline"){
 module=await import(${JSON.stringify(pathToFileURL(join(packageRoot,"dist/index.js")).href)});
 if(mode!=="import"){const result=module.parseUnit(values[mode]);if(!result.success)throw Error(JSON.stringify(result.error));}
}
globalThis.retained=module;
console.log(JSON.stringify({peakBytes:process.resourceUsage().maxRSS*1024,rssBytes:process.memoryUsage().rss}));
`);
const results=[];
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[2]!;
for(const [runtime,executable]of [["bun",process.execPath],["node",resolve(packageRoot,"../../node_modules/node/bin/node")]]){
 for(const mode of ["baseline","import","lemma","surface","reading","attestation"]){
  const samples=[];
  for(let i=0;i<5;i++){
   const child=Bun.spawn([executable,runner,mode],{stdout:"pipe",stderr:"pipe"});
   const [output,error,code]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
   if(code)throw Error(error);samples.push(JSON.parse(output));
  }
  const row={runtime,mode,medianPeakBytes:median(samples.map(sample=>sample.peakBytes)),samples};results.push(row);
  const baseline=results.find(row=>row.runtime===runtime&&row.mode==="baseline")!;
  console.log(runtime,mode,((row.medianPeakBytes-baseline.medianPeakBytes)/1048576).toFixed(3),"MiB peak RSS delta");
 }
}
writeFileSync(join(import.meta.dir,"production-rss.json"),JSON.stringify({capturedAt:new Date().toISOString(),bun:Bun.version,node:"24.19.0",metric:"Five fresh processes, median peak RSS minus baseline; maxRSS KiB converted to bytes; built public package entrypoint",results},null,2)+"\n");
