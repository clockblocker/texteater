import { expect, test } from "bun:test";
import { rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { preparePublishedRuntime } from "../dum-entrypoint-rss/published-runtime";

// Source-alias tests cannot establish cross-package Error constructor identity.
// This gate uses only packaged JavaScript in an unrelated temporary directory.
test("published Dum packages share errors and reject invalid inputs", async () => {
	const root = await preparePublishedRuntime(
		resolve(import.meta.dir, "../.."),
	);
	try {
		await writeFile(
			join(root, "published-gate.mjs"),
			`
import * as dumling from "dumling";
import * as dumrel from "dumrel";
import {ParsingError} from "common-utils";
const failures=[];
let checks=0;
function check(name,predicate){checks++;try{if(!predicate())failures.push(name);}catch(error){failures.push(name+": "+String(error));}}
check("Dumling exports the shared ParsingError constructor",()=>dumling.ParsingError===ParsingError);
check("Dumrel exports the shared ParsingError constructor",()=>dumrel.ParsingError===ParsingError);
const lemma={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}};
const reading={unitKind:"Reading",lemma,emojiDescription:"🏦"};
const invalid=[undefined,null,{},[],{unitKind:"Reading"},{...reading,emojiDescription:"invalid"},{...reading,lemma:{...lemma,coreFeatures:{gender:"INVALID",hyph:null}}}];
for(const [index,source] of invalid.entries()){
 check("parseUnit rejects invalid source "+index,()=>{const r=dumling.parseUnit(source);return !r.success&&r.error instanceof ParsingError&&r.error.issues.length>0;});
 for(const name of ["parseReadingKnowledge","applyKnowledgeChange"]){
  check(name+" rejects invalid source "+index,()=>{const r=dumrel[name]({source,knowledge:{},change:{kind:"Contribute",aspect:"definition",value:" bank "}});return !r.success&&r.error instanceof ParsingError&&r.error.issues.length>0;});
 }
}
check("Knowledge still normalizes valid values",()=>{const r=dumrel.parseReadingKnowledge({source:reading,knowledge:{definition:" bank "}});return r.success&&r.value.definition==="bank";});
check("Knowledge changes still normalize valid values",()=>{const r=dumrel.applyKnowledgeChange({source:reading,knowledge:{},change:{kind:"Contribute",aspect:"definition",value:" bank "}});return r.success&&r.value.definition==="bank";});
check("Projection rejects invalid nested Readings",()=>{const r=dumrel.projectSemanticRelations([{reading:{...reading,emojiDescription:"invalid"},knowledge:{}}]);return !r.success&&r.error instanceof ParsingError;});
check("A valid Lemma cannot stand in for a Reading",()=>{const r=dumrel.parseReadingKnowledge({source:lemma,knowledge:{}});return !r.success&&r.error instanceof ParsingError;});
console.log(JSON.stringify({passed:failures.length===0,checks,failures}));
`,
		);
		const child = Bun.spawn(
			[process.execPath, join(root, "published-gate.mjs")],
			{ cwd: root, stdout: "pipe", stderr: "pipe" },
		);
		const text = await new Response(child.stdout).text();
		if ((await child.exited) !== 0)
			throw new Error(await new Response(child.stderr).text());
		const result = JSON.parse(text);
		expect(result.failures).toEqual([]);
		expect(result.passed).toBe(true);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
