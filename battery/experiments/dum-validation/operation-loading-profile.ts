import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";
import { applyOperationSplitting } from "./apply-operation-splitting";

const repository = resolve(import.meta.dir, "../../..");
const destination = Bun.argv[2];
if (!destination)
	throw new Error("Usage: bun operation-loading-profile.ts OUTPUT.json");
const root = await preparePublishedRuntime(repository);
type Sample = {
	points: {
		label: string;
		peak: number;
		heap: number;
		rss: number;
		ms: number;
	}[];
	trace: { label: string; state: Record<string, unknown> }[];
	warm: { label: string; msPerCall: number }[];
};
const median = (xs: number[]) =>
	[...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
async function command(args: string[]) {
	const child = Bun.spawn(args, {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [out, err, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exit !== 0) throw new Error(err);
	return out;
}
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
	const sourceHashes = Object.fromEntries(
		[...originals].map(([path, source]) => [
			path.slice(root.length + 1),
			createHash("sha256").update(source).digest("hex"),
		]),
	);
	await writeFile(
		join(root, "profile-operations.mjs"),
		`
const points=[],modules={};
function point(label,ms=0){const m=process.memoryUsage();points.push({label,ms,peak:process.resourceUsage().maxRSS*1024,heap:m.heapUsed,rss:m.rss});}
const Effect=await import("effect/Effect"); point("effect");
for(const name of ["dumling","dumrel","dumdict/runtime","dumgen"]){modules[name]=await import(name);point(name);}
const states=()=>Object.fromEntries(Object.entries(modules).filter(([,m])=>m.__experimentState).map(([name,m])=>[name,m.__experimentState()]));
const tracing=process.argv[2]==="trace";
const trace=tracing?[{label:"import",state:states()}]:[];
const sentence={id:"experiment",language:"de",segments:[{kind:"ResolvableText",text:"Bank"}]};
const encounter={sentence,target:{family:"Lexeme",kind:"NOUN",memberSegmentIndices:[0]}};
const lemma={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}};
const reading={unitKind:"Reading",lemma,emojiDescription:"🏦"};
const api=modules.dumgen.createDumgen({execute:async request=>{
 if(request.stage==="segment")return {language:"de",items:[{id:"0",decision:"Accepted",language:"de",stitchedText:"Bank"}]};
 if(request.stage==="resolveGrammar")return {memberOrthographies:["Standard"],normalizedMembers:["Bank"],surface:{spelling:"Canonical",surfaceFeatures:null,inflectionalFeatures:{case:"Nom",number:"Sing"}},lemma:{canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}},realizationCoverage:"Full"};
 if(request.stage==="generateReadingEmojiDescription")return {emojiDescription:"🏦"};
 throw Error("Unexpected model request "+request.stage);
}});
const operations=[
 ["segmentation",()=>api.segment({sourceSentences:["Bank"]})],
 ["grammar",()=>api.resolveGrammar(encounter)],
 ["reading",()=>api.generateReadingEmojiDescription({encounter,lemma})],
 ["knowledge",()=>api.produceKnowledge({encounter,reading,request:{}})],
];
for(const [label,operation] of operations){const start=performance.now();const result=await Effect.runPromise(operation());
 if(label==="segmentation"&&result[0]?.decision!=="Accepted")throw Error("Bad segmentation");
 if(label==="grammar"&&result.unitKind!=="Attestation")throw Error("Bad grammar");
 if(label==="reading"&&result!=="🏦")throw Error("Bad Reading");
 if(label==="knowledge"&&(result.changes.length||result.pendingRelations.length))throw Error("Bad Knowledge");
 point(label,performance.now()-start);if(tracing)trace.push({label,state:states()});
}
const warm=[];
for(const [label,operation] of operations){const start=performance.now();for(let i=0;i<20;i++)await Effect.runPromise(operation());warm.push({label,msPerCall:(performance.now()-start)/20});}
point("warm");Bun.gc(true);point("after-gc");
console.log(JSON.stringify({points,trace,warm}));
`,
	);
	const results = [];
	for (const variant of [
		"external-runtime",
		"operation-split-dumgen",
		"operation-split-chain",
	]) {
		for (const [path, source] of originals) await writeFile(path, source);
		if (variant !== "external-runtime")
			await applyOperationSplitting(
				root,
				variant === "operation-split-chain",
			);
		let statistics = null;
		if (variant !== "external-runtime")
			statistics = JSON.parse(
				await readFile(
					join(
						root,
						"battery/experiments/dum-validation/operation-splitting-statistics.json",
					),
					"utf8",
				),
			);
		const builtHashes: Record<string, string> = {};
		for (const owner of ["dumling", "dumrel", "dumgen"]) {
			const index = join(root, "battery", owner, "src/index.ts");
			if (
				variant === "operation-split-chain" ||
				(variant === "operation-split-dumgen" && owner === "dumgen")
			)
				await writeFile(
					index,
					(await readFile(index, "utf8")) +
						'\nexport {operationRegistryState as __experimentState} from "./experiment-operation-registry.js";\n',
				);
			const entries = [
				index,
				...(owner === "dumling"
					? [
							join(
								root,
								"battery/dumling/src/validation/operations.ts",
							),
						]
					: []),
			];
			await command([
				join(repository, "node_modules/.bin/esbuild"),
				...entries,
				"--bundle",
				"--platform=node",
				"--format=esm",
				"--packages=external",
				"--external:common-utils",
				"--external:dumling",
				"--external:dumrel",
				`--outbase=${join(root, "battery", owner, "src")}`,
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
						join(root, "profile-operations.mjs"),
					]),
				),
			);
		const stages = samples[0].points.map(
			(p: { label: string }, i: number) => ({
				label: p.label,
				cumulativePeakMiB: median(
					samples.map(
						(s) => (s.points[i].peak - s.points[0].peak) / 1048576,
					),
				),
				addedPeakMiB: median(
					samples.map(
						(s) =>
							(s.points[i].peak -
								s.points[Math.max(i - 1, 0)].peak) /
							1048576,
					),
				),
				heapMiB: median(samples.map((s) => s.points[i].heap / 1048576)),
				coldMs: median(samples.map((s) => s.points[i].ms)),
			}),
		);
		const warm = samples[0].warm.map((p: { label: string }, i: number) => ({
			label: p.label,
			msPerCall: median(samples.map((s) => s.warm[i].msPerCall)),
		}));
		const traced: Sample = JSON.parse(
			await command([
				process.execPath,
				join(root, "profile-operations.mjs"),
				"trace",
			]),
		);
		results.push({
			variant,
			builtHashes,
			statistics,
			stages,
			warm,
			trace: traced.trace,
			samples,
		});
		console.log(
			JSON.stringify({ variant, stages, warm, trace: traced.trace }),
		);
	}
	await writeFile(
		resolve(destination),
		JSON.stringify(
			{
				capturedAt: new Date().toISOString(),
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				sourceHashes,
				method: "Seven fresh processes per variant. Effect -> Dumling -> Dumrel -> Dumdict/runtime -> Dumgen -> segmentation -> grammar -> Reading -> empty Knowledge request, then 20 warm calls each. Deterministic injected model responses; no network. Peak deltas are paired within each process. GC occurs after all measurements.",
				limitations:
					"Temporary rebuilds with identical explicit package externalization. Private state exports added only for instrumentation; no public API changes proposed. Full source DX gate runs separately. Encoded strings remain eagerly bundled. Catalog and prompt/model-schema initialization are unchanged. Not deployed Convex memory.",
				results,
			},
			null,
			2,
		) + "\n",
	);
} finally {
	await rm(root, { recursive: true, force: true });
}
