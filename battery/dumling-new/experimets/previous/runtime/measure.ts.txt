import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
const out=import.meta.dir;
const runtimes=[['bun',process.execPath],['node',resolve(import.meta.dir,'../../../../../node_modules/node/bin/node')]];
const modes=['empty','zod','noun','all','oldHeavy','oldParser'];
const results=[];
for(const [runtime,exe] of runtimes) {
 for(const mode of modes) {
  const samples=[];
  for(let n=0;n<5;n++) {
   const p=Bun.spawn([exe,out+'/runner.mjs',mode,'parse'],{stdout:'pipe',stderr:'pipe'});
   const stdout=await new Response(p.stdout).text();
   const stderr=await new Response(p.stderr).text();
   if(await p.exited) throw Error(stderr);
   const row=JSON.parse(stdout);
   samples.push({...row,rss:row.rss*1024});
  }
  const med=(key)=>samples.map(s=>s[key]).sort((a,b)=>a-b)[2];
  const result={runtime,mode,rss:med('rss'),elapsed:med('elapsed'),heap:med('heap'),samples};
  results.push(result);
  const base=results.find(r=>r.runtime===runtime&&r.mode==='empty');
  console.log(runtime,mode,'RSS delta MiB',((result.rss-base.rss)/1048576).toFixed(3),'load ms',result.elapsed.toFixed(2),'heap MiB',(result.heap/1048576).toFixed(2));
 }
}
writeFileSync(out+'/runtime-results.json',JSON.stringify(results,null,2));
