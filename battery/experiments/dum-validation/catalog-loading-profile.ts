import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";
import {
	applyCatalogSplitting,
	catalogSelector,
} from "./apply-catalog-splitting";
import { applyOperationSplitting } from "./apply-operation-splitting";

const repository = resolve(import.meta.dir, "../../..");
const destination = Bun.argv[2];
if (!destination)
	throw new Error("Usage: bun catalog-loading-profile.ts OUTPUT.json");
const root = await preparePublishedRuntime(repository);
const median = (xs: number[]) =>
	[...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
async function command(args: string[]) {
	const p = Bun.spawn(args, { cwd: root, stdout: "pipe", stderr: "pipe" });
	const [out, err, exit] = await Promise.all([
		new Response(p.stdout).text(),
		new Response(p.stderr).text(),
		p.exited,
	]);
	if (exit !== 0) throw new Error(err);
	return out;
}
type Sample = {
	points: {
		label: string;
		peak: number;
		heap: number;
		ms: number;
		state: unknown;
	}[];
	warm: { label: string; ms: number }[];
};
try {
	await mkdir(join(root, "battery/experiments/dum-validation"), {
		recursive: true,
	});
	const originals = new Map<string, string>();
	for (const owner of ["dumling", "dumrel", "dumgen"]) {
		const target = join(root, "battery", owner, "src");
		await cp(join(repository, "battery", owner, "src"), target, {
			recursive: true,
		});
		for (const relative of [
			"index.ts",
			owner === "dumling"
				? "parse-unit.ts"
				: owner === "dumgen"
					? "universal/validation.ts"
					: "validation.ts",
		]) {
			const path = join(target, relative);
			originals.set(path, await readFile(path, "utf8"));
		}
	}
	originals.set(
		join(root, catalogSelector),
		await readFile(join(root, catalogSelector), "utf8"),
	);
	const authored = "battery/dumgen/src/concrete-lang/de/authored-closed-sets";
	const fixtureText = await command([
		process.execPath,
		"--eval",
		`import {authoredMembers} from "./${authored}/inventory.ts"; import {selectGrammaticalAlternatives} from "./${authored}/select.ts"; const pron=authoredMembers.find(m=>m.lemma.kind==="PRON"&&m.lemma.canonicalForm==="mich"); const aux=authoredMembers.find(m=>m.lemma.kind==="AUX"&&m.lemma.canonicalForm==="sein"); const det=authoredMembers.find(m=>m.lemma.kind==="DET"); console.log(JSON.stringify({members:authoredMembers,pron,aux,det,alternatives:selectGrammaticalAlternatives({source:pron.lemma,vary:["case"]}),frozen:authoredMembers.map(m=>Object.isFrozen(m))}));`,
	]);
	const fixtures = JSON.parse(fixtureText);
	await writeFile(join(root, "fixtures.json"), fixtureText);
	await writeFile(
		join(root, "catalog-profile.mjs"),
		`
const points=[],warm=[];
function point(label,ms=0){const m=process.memoryUsage();points.push({label,ms,peak:process.resourceUsage().maxRSS*1024,heap:m.heapUsed,state:api?.__catalogState?.()??null});}
let api;
const Effect=await import("effect/Effect");point("effect");
for(const name of ["dumling","dumrel","dumdict/runtime"]){await import(name);point(name);}
let start=performance.now();api=await import("dumgen");point("dumgen-import",performance.now()-start);
const fixtures=${JSON.stringify({ aux: fixtures.aux, pron: fixtures.pron, det: fixtures.det, alternatives: fixtures.alternatives })};
const bank={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}};
const encounter=lemma=>({sentence:{id:"catalog",language:"de",segments:[{kind:"ResolvableText",text:lemma.canonicalForm}]},target:{family:lemma.family,kind:lemma.kind,memberSegmentIndices:[0]}});
let modelCalls=0;
const gen=api.createDumgen({execute:async r=>{modelCalls++;if(r.stage!=="resolveGrammar")throw Error("Unexpected generation "+r.stage);return {memberOrthographies:["Standard"],normalizedMembers:["Bank"],surface:{spelling:"Canonical",surfaceFeatures:null,inflectionalFeatures:{case:"Nom",number:"Sing"}},lemma:{canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}},realizationCoverage:"Full"};}});
const operations=[
 ["Bank",async()=>{const r=await Effect.runPromise(gen.resolveGrammar(encounter(bank)));if(r.unitKind!=="Attestation")throw Error("Bad Bank result");}],
 ["sein-AUX",async()=>{const r=await Effect.runPromise(gen.generateReadingEmojiDescription({encounter:encounter(fixtures.aux.lemma),lemma:fixtures.aux.lemma}));if(r!==fixtures.aux.reading.emojiDescription)throw Error("Bad auxiliary");}],
 ["pronoun-navigation",async()=>{const r=api.selectGrammaticalAlternatives({source:fixtures.pron.lemma,vary:["case"]});if(r instanceof Promise || JSON.stringify(r)!==JSON.stringify(fixtures.alternatives))throw Error("Pronoun contract changed");}],
 ["determiner-all-groups",async()=>{const r=await Effect.runPromise(gen.generateReadingEmojiDescription({encounter:encounter(fixtures.det.lemma),lemma:fixtures.det.lemma}));if(r!==fixtures.det.reading.emojiDescription)throw Error("Bad determiner");}],
];
for(const [label,run] of operations){start=performance.now();await run();point(label,performance.now()-start);}
for(const [label,run] of operations){start=performance.now();for(let i=0;i<20;i++)await run();warm.push({label,ms:(performance.now()-start)/20});}
point("warm");Bun.gc(true);point("after-gc");
if(modelCalls!==21)throw Error("Authored route unexpectedly called model");
if(process.argv.includes("--lazy")){
 const expected={"dumgen-import":[],Bank:[],"sein-AUX":["AUX"],"pronoun-navigation":["AUX","PRON"],"determiner-all-groups":["AUX","PRON","DET"]};
 for(const [label,groups] of Object.entries(expected))if(JSON.stringify(points.find(p=>p.label===label).state.groups)!==JSON.stringify(groups))throw Error("Unexpected eager or missing catalog group: "+label);
}
if(process.argv[2]==="contract"){
 const all=await Bun.file(new URL("./fixtures.json",import.meta.url)).json();let checks=0;
 for(const [i,member] of all.members.entries()){
  const input=structuredClone(member.lemma),before=JSON.stringify(input),a=api.__lookup(input),b=api.__lookup(input);
  if(JSON.stringify(a)!==JSON.stringify(member)||a!==b||JSON.stringify(input)!==before||Object.isFrozen(a)!==all.frozen[i])throw Error("Catalog equivalence/identity/input-mutation/freeze mismatch "+i);
  const emoji=await Effect.runPromise(gen.generateReadingEmojiDescription({encounter:encounter(member.lemma),lemma:member.lemma}));
  if(emoji!==member.reading.emojiDescription)throw Error("Public authored result differs "+i);
  checks++;
 }
 if(api.__lookup(bank)!==undefined)throw Error("Open-route miss changed");
 const missing=await Effect.runPromise(Effect.either(gen.generateReadingEmojiDescription({encounter:encounter(fixtures.aux.lemma),lemma:{...fixtures.aux.lemma,canonicalForm:"__missing__"}})));
 if(missing._tag!=="Left"||missing.left._tag!=="CatalogMiss")throw Error("Closed-route miss error changed");
 console.log(JSON.stringify({passed:true,members:checks,modelCalls,state:api.__catalogState()}));
}else console.log(JSON.stringify({points,warm}));
`,
	);
	const results = [];
	for (const variant of [
		"external-runtime",
		"operation-split-chain",
		"catalog-lazy",
		"catalog-and-registries",
	]) {
		for (const [path, source] of originals) await writeFile(path, source);
		if (
			variant === "operation-split-chain" ||
			variant === "catalog-and-registries"
		)
			await applyOperationSplitting(root, true);
		const lazy = variant.startsWith("catalog-");
		const statistics = lazy ? await applyCatalogSplitting(root) : null;
		const index = join(root, "battery/dumgen/src/index.ts");
		await writeFile(
			index,
			(await readFile(index, "utf8")) +
				`\nexport {authoredFor as __lookup} from "./concrete-lang/de/authored-closed-sets/select.js";\n` +
				(lazy
					? `export {catalogState as __catalogState} from "./concrete-lang/de/authored-closed-sets/experiment-catalog-loader.js";\n`
					: `export const __catalogState=()=>({groups:["AUX","DET","PRON"],members:${fixtures.members.length}});\n`),
		);
		const builtHashes: Record<string, string> = {};
		for (const owner of ["dumling", "dumrel", "dumgen"]) {
			const src = join(root, "battery", owner, "src");
			await command([
				join(repository, "node_modules/.bin/esbuild"),
				join(src, "index.ts"),
				...(owner === "dumling"
					? [join(src, "validation/operations.ts")]
					: []),
				"--bundle",
				"--platform=node",
				"--format=esm",
				"--packages=external",
				"--external:common-utils",
				"--external:dumling",
				"--external:dumrel",
				`--outbase=${src}`,
				`--outdir=${join(root, "node_modules", owner, "dist")}`,
			]);
			builtHashes[owner] = createHash("sha256")
				.update(
					await readFile(
						join(root, "node_modules", owner, "dist/index.js"),
					),
				)
				.digest("hex");
		}
		const samples: Sample[] = [];
		for (let i = 0; i < 7; i++)
			samples.push(
				JSON.parse(
					await command([
						process.execPath,
						join(root, "catalog-profile.mjs"),
						"measure",
						...(lazy ? ["--lazy"] : []),
					]),
				),
			);
		const contract = JSON.parse(
			await command([
				process.execPath,
				join(root, "catalog-profile.mjs"),
				"contract",
				...(lazy ? ["--lazy"] : []),
			]),
		);
		const stages = samples[0]!.points.map((point, i) => ({
			label: point.label,
			state: point.state,
			peakAboveEffectMiB: median(
				samples.map(
					(s) => (s.points[i]!.peak - s.points[0]!.peak) / 1048576,
				),
			),
			coldMs: median(samples.map((s) => s.points[i]!.ms)),
			heapMiB: median(samples.map((s) => s.points[i]!.heap / 1048576)),
		}));
		const warm = samples[0]!.warm.map((p, i) => ({
			label: p.label,
			ms: median(samples.map((s) => s.warm[i]!.ms)),
		}));
		results.push({
			variant,
			builtHashes,
			statistics,
			contract,
			stages,
			warm,
			samples,
		});
		console.log(JSON.stringify({ variant, contract, stages, warm }));
	}
	await writeFile(
		resolve(destination),
		JSON.stringify(
			{
				capturedAt: new Date().toISOString(),
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				sourceHashes: Object.fromEntries(
					[...originals].map(([p, s]) => [
						p.slice(root.length + 1),
						createHash("sha256").update(s).digest("hex"),
					]),
				),
				method: "Seven fresh published-runtime processes per variant. Preload Effect -> Dumling -> Dumrel -> Dumdict -> Dumgen. Bank grammar -> sein authored Reading -> pronoun navigation -> determiner (all catalog groups), then 20 warm calls each. Separate exhaustive 168-member contract process. Deterministic injected model; no network. GC only at end.",
				limitations:
					"Synchronous lazy module initialization; code still ships upfront. Current baseline already removed freezing. Freeze state is preserved, not newly guaranteed. Identical package externalization in every variant. Diagnostic private exports only in profiling builds. Full DX gate is separate. Local Bun replay, not deployed Convex.",
				results,
			},
			null,
			2,
		) + "\n",
	);
} finally {
	await rm(root, { recursive: true, force: true });
}
