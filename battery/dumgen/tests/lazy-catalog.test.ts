import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("public operations initialize only needed catalog groups and retain synchronous navigation", async () => {
	const child = Bun.spawn(
		[
			process.execPath,
			"--eval",
			`
import {createDumgen,selectGrammaticalAlternatives} from "./src/index.ts";
import {catalogState,membersFor} from "./src/generated/catalog.ts";
import {validationRegistryState} from "./src/generated/validation-runtime.ts";
import * as Effect from "effect/Effect";
import assert from "node:assert/strict";
assert.deepEqual(catalogState().groups,[]);
assert.deepEqual(validationRegistryState().groups,[]);
const noun={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}};
const encounter=lemma=>({sentence:{id:"test",language:"de",segments:[{kind:"ResolvableText",text:lemma.canonicalForm}]},target:{family:lemma.family,kind:lemma.kind,memberSegmentIndices:[0]}});
let calls=0;
const gen=createDumgen({execute:async request=>{calls++;assert.equal(request.stage,"resolveGrammar");return {memberOrthographies:["Standard"],normalizedMembers:["Bank"],surface:{spelling:"Canonical",surfaceFeatures:null,inflectionalFeatures:{case:"Nom",number:"Sing"}},lemma:{canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}},realizationCoverage:"Full"};}});
const bank=await Effect.runPromise(gen.resolveGrammar(encounter(noun)));
assert.equal(bank.surface.lemma.canonicalForm,"Bank");
assert.deepEqual(catalogState().groups,[]);
const aux={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"AUX",canonicalForm:"sein",coreFeatures:{verbType:null}};
const emoji=await Effect.runPromise(gen.generateReadingEmojiDescription({encounter:encounter(aux),lemma:aux}));
assert.equal(typeof emoji,"string");assert.equal(calls,1);
assert.deepEqual(catalogState().groups,["de/Lexeme/AUX"]);
const members=membersFor({...noun,kind:"PRON"});
const pron=members.find(m=>m.lemma.canonicalForm==="mich");assert.ok(pron);
const before=JSON.stringify(pron);
const alternatives=selectGrammaticalAlternatives({source:pron.lemma,vary:["case"]});
assert.ok(Array.isArray(alternatives));assert.ok(alternatives.length>0);
assert.equal(JSON.stringify(pron),before);
assert.equal(membersFor(pron.lemma),members);
assert.deepEqual(catalogState().groups,["de/Lexeme/AUX","de/Lexeme/PRON"]);
// Load the authoring inventory only after observing lazy public behavior.
const {authoredMembers}=await import("./src/concrete-lang/de/authored-closed-sets/inventory.ts");
for(const member of authoredMembers){
 const group=membersFor(member.lemma);
 assert.deepEqual(group,authoredMembers.filter(m=>m.lemma.language===member.lemma.language&&m.lemma.family===member.lemma.family&&m.lemma.kind===member.lemma.kind));
 assert.ok(group.includes(member));
}
assert.equal(catalogState().members,authoredMembers.length);
const miss=await Effect.runPromise(Effect.either(gen.generateReadingEmojiDescription({encounter:encounter(aux),lemma:{...aux,canonicalForm:"__absent__"}})));
assert.equal(miss._tag,"Left");assert.equal(miss.left._tag,"CatalogMiss");
console.log(JSON.stringify({members:authoredMembers.length,calls}));
`,
		],
		{
			cwd: fileURLToPath(new URL("..", import.meta.url)),
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [stdout, stderr, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	expect(stderr).toBe("");
	expect(exit).toBe(0);
	expect(JSON.parse(stdout).members).toBeGreaterThan(0);
	expect(JSON.parse(stdout).calls).toBe(1);
});
