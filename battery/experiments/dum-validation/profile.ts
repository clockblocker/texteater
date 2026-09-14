import { rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";

const root = await preparePublishedRuntime(
	resolve(import.meta.dir, "../../.."),
);
try {
	await writeFile(
		join(root, "profile.mjs"),
		`
import assert from "node:assert/strict";
const api = await import("dumrel");
const workload = Bun.argv[2];
const size = Number(Bun.argv[3]);
const iterations = Number(Bun.argv[4]);
const lemma = index => ({unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank"+index,coreFeatures:{gender:"Fem",hyph:null}});
const reading = index => ({unitKind:"Reading",lemma:lemma(index),emojiDescription:"🏦"});
const entries = Array.from({length:size},(_,i)=>({reading:reading(i),knowledge:i+1<size?{semanticRelations:{synonym:[lemma(i+1)]}}:{}}));
if(workload==="invalid-projection") entries[entries.length-1].reading.emojiDescription="invalid";
function run(){
 if(workload==="change") return api.applyKnowledgeChange({source:reading(0),knowledge:{},change:{kind:"Contribute",aspect:"definition",value:" bank "}});
 if(workload==="select") return api.selectKnowledge({route:{language:"de",family:"Lexeme",kind:"NOUN"}});
 return api.projectSemanticRelations(entries);
}
const imported = process.memoryUsage();
const coldStart=performance.now();const first=run();const coldMs=performance.now()-coldStart;
assert.equal(first.success,workload!=="invalid-projection");
for(let i=0;i<(size>=64?0:10);i++)run();
const start=performance.now();for(let i=0;i<iterations;i++)run();const totalMs=performance.now()-start;
const beforeGc=process.memoryUsage();Bun.gc(true);const afterGc=process.memoryUsage();
console.log(JSON.stringify({coldMs,totalMs,msPerOperation:totalMs/iterations,peakRssBytes:process.resourceUsage().maxRSS*1024,imported,beforeGc,afterGc,resultSize:first.success&&Array.isArray(first.value)?first.value.length:null}));
`,
	);
	const profiles = [];
	for (const [workload, size, iterations] of [
		["change", 1, 1000],
		["select", 1, 1000],
		["projection", 1, 1000],
		["projection", 16, 40],
		["projection", 64, 1],
		["invalid-projection", 16, 40],
	] as const) {
		const samples = [];
		for (let index = 0; index < 5; index++) {
			const child = Bun.spawn(
				[
					process.execPath,
					join(root, "profile.mjs"),
					workload,
					String(size),
					String(iterations),
				],
				{ cwd: root, stdout: "pipe", stderr: "pipe" },
			);
			const output = await new Response(child.stdout).text();
			if ((await child.exited) !== 0)
				throw new Error(await new Response(child.stderr).text());
			samples.push(JSON.parse(output));
		}
		profiles.push({ workload, size, iterations, samples });
		console.log(`Profiled ${workload}(${size})`);
	}
	await writeFile(
		Bun.argv[2]!,
		`${JSON.stringify({ note: "Sequential fresh processes. Forced GC is diagnostic only and is not part of the official RSS gate.", profiles }, null, 2)}\n`,
	);
} finally {
	await rm(root, { recursive: true, force: true });
}
