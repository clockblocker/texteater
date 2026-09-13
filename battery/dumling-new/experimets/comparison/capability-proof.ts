// Small semantic probes, not timing benchmarks.
import { strict as assert } from "node:assert";
import * as arri from "@arrirpc/schema";
import { z } from "zod";

const bag = arri.object({case:arri.nullable(arri.stringEnum(["Nom","Acc"])), number:arri.nullable(arri.stringEnum(["Sing","Plur"]))},{isStrict:true});
const equivalentStructure = z.strictObject({case:z.enum(["Nom","Acc"]).nullable(), number:z.enum(["Sing","Plur"]).nullable()});
const markedBag = equivalentStructure.refine(value => Object.values(value).some(value => value !== null));
const allNull = {case:null,number:null};
assert.equal(arri.parse(bag,allNull).success,true);
assert.equal(markedBag.safeParse(allNull).success,false);
assert.equal(arri.parse(bag,JSON.stringify(allNull)).success,true);
assert.equal(equivalentStructure.safeParse(JSON.stringify(allNull)).success,false);
assert.equal(arri.parse(arri.array(arri.string()),[]).success,true);

const publicNames = new Set(Object.keys(arri));
const absentConvenienceBuilders = ["union","tuple","refine","transform","check"].filter(name => !publicNames.has(name));
// This is a statement about the pinned ordinary export surface, not impossibility
// of implementing additional semantics using arbitrary TypeScript or internal hooks.
assert.deepEqual(absentConvenienceBuilders,["union","tuple","refine","transform","check"]);
console.log(JSON.stringify({allNullNeedsExtraRefinement:true,parseAcceptsJsonText:true,arrayAcceptsEmpty:true,absentConvenienceBuilders}));
