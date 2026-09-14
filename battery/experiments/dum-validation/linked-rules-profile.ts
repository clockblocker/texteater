import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";
import { applyLinkedRules } from "./apply-linked-rules";

const repository = resolve(import.meta.dir, "../../..");
const destination = Bun.argv[2];
if (!destination)
	throw new Error("Usage: bun linked-rules-profile.ts OUTPUT.json");
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
			"generated/validation.ts",
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
	for (const owner of ["dumling", "dumrel", "dumgen"]) {
		const source = await readFile(
			join(repository, `battery/${owner}/package.json`),
			"utf8",
		);
		const path = join(root, `battery/${owner}/package.json`);
		await writeFile(path, source);
		originals.set(path, source);
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
const states=()=>Object.fromEntries(Object.entries(modules).filter(([,m])=>m.__experimentState).map(([name,m])=>[name,{...m.__experimentState(),reuse:m.__reuseState?.()}]));
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
point("warm");
// Force one malformed unit through exact diagnostics after successful grammar reuse.
let rejected=false;try {modules.dumgen.__experimentParse("lemmaSchema",{...lemma,coreFeatures:{gender:"INVALID",hyph:null}},"experiment");}catch(error){if(error._tag!=="InvalidInput")throw error;rejected=true;}
if(!rejected)throw Error("Invalid unit accepted");point("invalid-unit");if(tracing)trace.push({label:"invalid-unit",state:states()});
Bun.gc(true);point("after-gc");
console.log(JSON.stringify({points,trace,warm}));
`,
	);
	const results = [];
	for (const variant of ["external-runtime", "linked-rules"]) {
		for (const [path, source] of originals) await writeFile(path, source);
		if (variant === "linked-rules") {
			await applyLinkedRules(root);
			for (const owner of ["dumling", "dumrel", "dumgen"])
				await cp(
					join(root, `battery/${owner}/package.json`),
					join(root, `node_modules/${owner}/package.json`),
				);
		}
		const statistics =
			variant === "linked-rules"
				? JSON.parse(
						await readFile(
							join(
								root,
								"battery/experiments/dum-validation/linked-rules-statistics.json",
							),
							"utf8",
						),
					)
				: null;
		const builtHashes: Record<string, string> = {};
		for (const owner of ["dumling", "dumrel", "dumgen"]) {
			const index = join(root, "battery", owner, "src/index.ts");
			if (owner === "dumgen")
				await writeFile(
					index,
					(await readFile(index, "utf8")) +
						'\nexport {parse as __experimentParse} from "./universal/validation.js";\n',
				);
			const entries = [
				index,
				...(variant === "linked-rules" && owner !== "dumgen"
					? [
							join(
								root,
								`battery/${owner}/src/experiment-linked-registry.ts`,
							),
						]
					: []),
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
				"--splitting",
				"--platform=node",
				"--format=esm",
				"--packages=external",
				"--external:common-utils",
				"--external:dumling",
				"--external:dumrel",
				`--outbase=${join(root, "battery", owner, "src")}`,
				`--outdir=${join(root, "node_modules", owner, "dist")}`,
			]);
			const dist = join(root, "node_modules", owner, "dist");
			for (const file of (await readdir(dist, { recursive: true }))
				.filter((file) => file.endsWith(".js"))
				.sort())
				builtHashes[`${owner}/${file}`] = createHash("sha256")
					.update(await readFile(join(dist, file)))
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
				experimentHashes: Object.fromEntries(
					await Promise.all(
						[
							"linked-rules-profile.ts",
							"apply-linked-rules.ts",
							"link-registries.ts",
						].map(async (file) => [
							file,
							createHash("sha256")
								.update(
									await readFile(join(import.meta.dir, file)),
								)
								.digest("hex"),
						]),
					),
				),
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				sourceHashes,
				method: "Seven fresh processes per variant. Effect -> Dumling -> Dumrel -> Dumdict/runtime -> Dumgen -> segmentation -> grammar -> Reading -> empty Knowledge request, then 20 warm calls each and a malformed Lemma to exercise exact errors. Deterministic injected model responses; no network. Peak deltas are paired within each process. GC occurs after all measurements.",
				limitations:
					"Both controls use explicit package externalization and ESM splitting. Private parser export is measurement instrumentation. Linked variant uses eager shared tables and exact provider fingerprints, with no parseUnit fallback. Separate full DX gate. Dumdict, catalog, prompts and model JSON schemas unchanged. Not deployed Convex memory.",
				results,
			},
			null,
			2,
		) + "\n",
	);
} finally {
	await rm(root, { recursive: true, force: true });
}
