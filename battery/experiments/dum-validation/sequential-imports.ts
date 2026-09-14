import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";

// Replay tf-demo's public package imports in one process. No app initialization,
// provider SDK, network calls, forced GC, or deployed Convex runtime is included.
const destination = Bun.argv[2];
if (!destination)
	throw new Error("Usage: bun sequential-imports.ts OUTPUT.json");
const repository = resolve(import.meta.dir, "../../..");
const root = await preparePublishedRuntime(repository);
const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
type Point = { label: string; peak: number; rss: number; heap: number };
type Sample = { points: Point[]; reused: boolean };

try {
	const hashes: Record<string, string> = {};
	async function fingerprint(directory: string) {
		for (const item of await readdir(directory, { withFileTypes: true })) {
			const path = join(directory, item.name);
			if (item.isDirectory()) await fingerprint(path);
			else if (item.isFile())
				hashes[path.slice(root.length + 1)] = createHash("sha256")
					.update(await readFile(path))
					.digest("hex");
		}
	}
	for (const name of [
		"common-utils",
		"dumling",
		"dumrel",
		"dumdict",
		"dumgen",
	])
		await fingerprint(join(root, "node_modules", name));
	const dumgen = join(root, "node_modules/dumgen/dist/index.js");
	const current = await readFile(dumgen, "utf8");
	if (
		!current.includes('from "effect/Effect"') ||
		!/function defineAuthoredMember\(\w+\) \{\s*return freeze\(\w+\);\s*\}/.test(
			current,
		)
	)
		throw new Error(
			"Expected current Dumgen build with narrow Effect and build-time catalog validation; rebuild or update the probe.",
		);
	// Reconstruct only the two earlier startup behaviors in the staged bundle.
	// Unique names avoid collisions with other bundled functions and imports.
	const previous = `import {parseUnit as experimentParseUnit} from "dumling";
import {parseReadingKnowledge as experimentParseKnowledge} from "dumrel";
${current
	.replace(
		/import \* as (\w+) from "effect\/Effect";/,
		'import { Effect as $1 } from "effect";',
	)
	.replace(
		/function defineAuthoredMember\((\w+)\) \{\s*return freeze\(\w+\);\s*\}/,
		`function defineAuthoredMember($1) {
 const unit=experimentParseUnit($1.reading); if(!unit.success)throw unit.error;
 const knowledge=experimentParseKnowledge({source:$1.reading,knowledge:$1.knowledge});
 if(!knowledge.success)throw knowledge.error;
 return freeze($1);
}`,
	)}`;
	await writeFile(
		join(root, "sequential.mjs"),
		`
const points=[];
function sample(label) {
 const usage=process.memoryUsage();
 points.push({label,peak:process.resourceUsage().maxRSS*1024,rss:usage.rss,heap:usage.heapUsed});
}
sample("empty");
if(process.argv[2]==="effect-first") {await import("effect/Effect");sample("effect/Effect");}
const modules=new Map();
for(const name of ["dumling","dumrel","dumdict/runtime","dumgen"]) {
 modules.set(name,await import(name));sample(name);
}
let reused=true;
for(const [name,module] of modules) reused &&= module === await import(name);
sample("repeat all imports");
console.log(JSON.stringify({points,reused}));
`,
	);
	const cases = [];
	for (const [variant, source] of [
		["previous-startup-reconstructed", previous],
		["current-built-packages", current],
	] as const) {
		await writeFile(dumgen, source);
		for (const order of ["dumling-first", "effect-first"]) {
			const samples: Sample[] = [];
			for (let i = 0; i < 7; i++) {
				const child = Bun.spawn(
					[process.execPath, join(root, "sequential.mjs"), order],
					{
						cwd: root,
						stdout: "pipe",
						stderr: "pipe",
					},
				);
				const [stdout, stderr, exit] = await Promise.all([
					new Response(child.stdout).text(),
					new Response(child.stderr).text(),
					child.exited,
				]);
				if (exit !== 0) throw new Error(stderr);
				samples.push(JSON.parse(stdout));
			}
			const stages = samples[0]!.points.map((point, index) => ({
				label: point.label,
				cumulativePeakMiB: median(
					samples.map(
						(s) =>
							(s.points[index]!.peak - s.points[0]!.peak) /
							1048576,
					),
				),
				addedPeakMiB: median(
					samples.map(
						(s) =>
							(s.points[index]!.peak -
								s.points[Math.max(0, index - 1)]!.peak) /
							1048576,
					),
				),
				currentRssMiB: median(
					samples.map((s) => s.points[index]!.rss / 1048576),
				),
				heapMiB: median(
					samples.map((s) => s.points[index]!.heap / 1048576),
				),
			}));
			cases.push({
				variant,
				order,
				stages,
				allRepeatedImportsReused: samples.every((s) => s.reused),
				samples,
			});
		}
	}
	await writeFile(
		resolve(destination),
		`${JSON.stringify(
			{
				capturedAt: new Date().toISOString(),
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				builtArtifactHashes: hashes,
				method: "Seven fresh processes per case; sequential imports within each process. Stage increments and cumulative increments are medians of paired measurements. Their medians need not add exactly. No forced GC. Peak RSS increments measure new high-water marks, not all allocations or retained heap.",
				limitations:
					"Local staged-package replay of tf-demo library imports, not a deployed Convex or whole-app measurement. Excludes provider SDK and app initialization. Previous startup is reconstructed from the current build by restoring broad Effect import and catalog validation only. Current packages include concurrent uncommitted work; artifacts are fingerprinted.",
				cases,
			},
			null,
			2,
		)}\n`,
	);
	console.log(
		JSON.stringify(
			cases.map(({ samples: _, ...summary }) => summary),
			null,
			2,
		),
	);
} finally {
	await rm(root, { recursive: true, force: true });
}
