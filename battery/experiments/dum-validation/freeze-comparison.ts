import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";

const repository = resolve(import.meta.dir, "../../..");
const command = Bun.argv[2];
const directory = resolve(
	Bun.argv[3] ?? join(import.meta.dir, ".runs/unfreeze"),
);
async function execute(args: string[], cwd = repository) {
	const child = Bun.spawn(args, { cwd, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, status] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (status !== 0) throw new Error(stderr || stdout);
	return stdout;
}
if (command === "capture-before" || command === "capture-after") {
	const destination = join(directory, command.slice(8));
	if (await Bun.file(join(destination, "captured.json")).exists())
		throw new Error(`Snapshot already exists: ${destination}`);
	const staged = await preparePublishedRuntime(repository);
	try {
		await mkdir(directory, { recursive: true });
		await cp(staged, destination, { recursive: true });
		const helper = join(destination, "helpers.ts");
		await writeFile(
			helper,
			`export {segmentGerman} from ${JSON.stringify(join(repository, "battery/dumgen/src/concrete-lang/de/segmentation/segment.ts"))};
export {createGermanHighLevelTargetClassificationProjection} from ${JSON.stringify(join(repository, "battery/dumgen/src/concrete-lang/de/target-classification/projection.ts"))};`,
		);
		await execute([
			join(repository, "node_modules/.bin/esbuild"),
			helper,
			"--bundle",
			"--packages=external",
			"--platform=node",
			"--format=esm",
			`--outfile=${join(destination, "helpers.mjs")}`,
		]);
		const hashes: Record<string, string> = {};
		for (const name of [
			"helpers.mjs",
			"node_modules/dumgen/dist/index.js",
			"node_modules/dumdict/dist/runtime.js",
			"node_modules/dumdict/dist/memory.js",
		])
			hashes[name] = createHash("sha256")
				.update(await readFile(join(destination, name)))
				.digest("hex");
		await writeFile(
			join(destination, "captured.json"),
			JSON.stringify(
				{ capturedAt: new Date().toISOString(), hashes },
				null,
				2,
			),
		);
		console.log(`Captured ${destination}`);
	} finally {
		await rm(staged, { recursive: true, force: true });
	}
} else if (command === "measure") {
	const worker = `
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
const emptyPeak=process.resourceUsage().maxRSS*1024;
const Effect=await import("effect/Effect");
await import("dumling");await import("dumrel");
const dictApi=await import("dumdict/runtime");const dumgenApi=await import("dumgen");
const importPeak=process.resourceUsage().maxRSS*1024;
const {createMemoryStorage}=await import("dumdict/memory");
const {segmentGerman,createGermanHighLevelTargetClassificationProjection}=await import("./helpers.mjs");
const sentence="Ich gehe heute mit meiner Schwester zur Bank und danach kaufen wir frisches Brot.";
const segments=segmentGerman(sentence).segments;
const input={segments,clickedSegmentIndex:segments.findIndex(s=>s.text==="Bank")};
const classification={decision:"Resolved",additionalMemberIndices:[],target:{family:"Lexeme",kind:"NOUN"}};
const storage=createMemoryStorage("en");const dict=dictApi.createDumdictService({language:"en",storage});
const lemma={unitKind:"Lemma",canonicalForm:"run",coreFeatures:{style:null,phrasal:null,hasGovPrep:null,extPos:null,abbr:null},language:"en",family:"Lexeme",kind:"VERB"};
const draft={reading:{unitKind:"Reading",lemma,emojiDescription:"🏃"},note:{attestedTranslations:["run"],attestations:["They run every morning."],notes:"Core running reading."}};
const dumgen=dumgenApi.createDumgen({execute:async request=> request.stage==="segment" ? {language:"de",items:request.input.items.map(i=>({id:i.id,decision:"Accepted",language:"de",stitchedText:i.sourceText}))} : classification});
const workload=process.argv[2];const iterations=Number(process.argv[3]);
const run=workload==="segment-helper" ? ()=>segmentGerman(sentence) :
 workload==="classification-helper" ? ()=>{const p=createGermanHighLevelTargetClassificationProjection(input);const target=p.canonicalize(classification);return {modelInput:p.modelInput,target,materialized:p.materialize(target)};} :
 workload==="prepare-note" ? ()=>Effect.runPromise(dict.prepare.addNewNote({draft})) :
 workload==="segment-public" ? ()=>Effect.runPromise(dumgen.segment({sourceSentences:[sentence]})) :
 workload==="classify-public" ? ()=>Effect.runPromise(dumgen.classifyTarget({sentence:{id:"bench",language:"de",segments},clickedSegmentIndex:input.clickedSegmentIndex})) :
 ()=>{const layer=dictApi.createDumdictLayer("en");return {service:layer.Service.key,storage:layer.Storage.key};};
const beforeWork=process.resourceUsage().maxRSS*1024;
const first=await run();
assert.ok(first);
if(workload==="prepare-note"){assert.ok(first.plan.changes.length>0);assert.equal(storage.snapshot().length,0);}
for(let i=0;i<30;i++)await run();
const start=performance.now();for(let i=0;i<iterations;i++)await run();const elapsedMs=performance.now()-start;
const peak=process.resourceUsage().maxRSS*1024;
// Ignore only the generated sentence ID when checking equivalent outputs.
const canonical=JSON.stringify(first,(key,value)=>key==="id" ? "<id>" : value);
console.log(JSON.stringify({iterations,msPerOperation:elapsedMs/iterations,peakBytes:peak,extraPeakBytes:peak-emptyPeak,importDeltaBytes:importPeak-emptyPeak,workloadPeakIncreaseBytes:peak-beforeWork,resultHash:createHash("sha256").update(canonical).digest("hex")}));
`;
	const configurations = [
		["segment-helper", 3000],
		["classification-helper", 15000],
		["prepare-note", 300],
		["segment-public", 300],
		["classify-public", 300],
		["layer", 15000],
	] as const;
	const results: {
		variant: string;
		workload: string;
		samples: Record<string, any>[];
	}[] = [];
	for (const variant of ["before", "after"]) {
		await writeFile(join(directory, variant, "worker.mjs"), worker);
		for (const [workload] of configurations)
			results.push({ variant, workload, samples: [] });
	}
	for (let round = 0; round < 7; round++) {
		for (const [workload, iterations] of configurations) {
			for (const variant of round % 2
				? ["after", "before"]
				: ["before", "after"]) {
				const stdout = await execute(
					[
						process.execPath,
						join(directory, variant, "worker.mjs"),
						workload,
						String(iterations),
					],
					join(directory, variant),
				);
				results
					.find(
						(r) => r.variant === variant && r.workload === workload,
					)!
					.samples.push(JSON.parse(stdout));
			}
		}
		console.log(`Measured paired round ${round + 1}/7`);
	}
	const median = (values: number[]) =>
		[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
	const summaries = results.map((r) => ({
		...r,
		msPerOperation: median(r.samples.map((s) => s.msPerOperation)),
		peakMiB: median(r.samples.map((s) => s.peakBytes / 1048576)),
		extraPeakMiB: median(r.samples.map((s) => s.extraPeakBytes / 1048576)),
		importDeltaMiB: median(
			r.samples.map((s) => s.importDeltaBytes / 1048576),
		),
		workloadPeakIncreaseMiB: median(
			r.samples.map((s) => s.workloadPeakIncreaseBytes / 1048576),
		),
	}));
	const equivalent = configurations.every(
		([workload]) =>
			new Set(
				results
					.filter((r) => r.workload === workload)
					.flatMap((r) => r.samples.map((s) => s.resultHash)),
			).size === 1,
	);
	await writeFile(
		join(directory, "comparison.json"),
		JSON.stringify(
			{
				capturedAt: new Date().toISOString(),
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				before: JSON.parse(
					await readFile(
						join(directory, "before/captured.json"),
						"utf8",
					),
				),
				after: JSON.parse(
					await readFile(
						join(directory, "after/captured.json"),
						"utf8",
					),
				),
				equivalent,
				method: "Seven paired fresh processes per workload, alternating variant order. Thirty warmups, fixed iteration count. Local published package runtime, deterministic fake model responses, no network or forced GC. Helpers are separately bundled implementations. Peak includes library imports and the complete workload; it is not retained heap. These are local timings, not LLM response latency.",
				results: summaries,
			},
			null,
			2,
		) + "\n",
	);
	console.log(
		JSON.stringify(
			summaries.map(({ samples: _, ...s }) => s),
			null,
			2,
		),
	);
	if (!equivalent) throw new Error("Before/after outputs differ");
} else
	throw new Error(
		"Use capture-before, capture-after, or measure, followed by an output directory.",
	);
