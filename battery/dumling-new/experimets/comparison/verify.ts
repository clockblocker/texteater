import { strict as assert } from "node:assert";
import { sample, unitKinds } from "./fixtures.ts";
const selected=process.argv[2];
if(!selected){
 for(const size of [100,1000]) for(const lib of ["zod","valibot","arktype","arri"]){
  const child=Bun.spawn([process.execPath,import.meta.path,`${lib}-${size}`],{stdout:"inherit",stderr:"inherit"});
  if(await child.exited)throw Error(`Failed verification: ${lib}-${size}`);
 }
}else{
 const size=Number(selected.split("-").at(-1));
 const {parseUnit}=await import(`./generated/${selected}/model.ts`);
 let checks=0;
 const check=(input:unknown,success:boolean)=>{const result=parseUnit(input);assert.equal(result.success,success,JSON.stringify({selected,input,result}));checks++;return result;};
 for(let i=0;i<size;i++)for(const kind of unitKinds){
  const input=sample(i,kind);const out=check(input,true);assert.deepEqual(out.data,input.value);checks++;
  check({...input,value:JSON.stringify(input.value)},false);
  check({...input,unexpected:true},false);
  check({...input,value:{...input.value,unexpected:true}},false);
  check({...input,language:"missing"},false);
 }
 for(const input of [null,[],{},true,42,"value"])check(input,false);
 const noun=sample(0,"Lemma");
 const body=noun.value as any;
 for(const features of [{...body.coreFeatures,gender:"Wrong"},{...body.coreFeatures,code:"r1"},{...body.coreFeatures,flags:[false]},{code:"r0"}])check({...noun,value:{...body,coreFeatures:features}},false);
 const surface=sample();check({...surface,value:{...surface.value,inflectionalFeatures:null}},true);
 assert.equal(parseUnit(noun,{unitKind:"Lemma",language:"l1",family:"F0",kind:"K0"}).success,false);checks++;
 console.log(selected,checks,"checks passed");
}
