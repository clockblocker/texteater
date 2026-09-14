import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Consolidates an expensive run into one portable evidence artifact. */
const directory = resolve(Bun.argv[2] ?? "");
const destination = Bun.argv[3];
if (!Bun.argv[2] || !destination)
	throw new Error("Usage: bun summarize.ts RUN_DIRECTORY OUTPUT.json");
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const summary = await json(join(directory, "summary.json"));
const metadata = await json(join(directory, "metadata.json"));
const stressFile = join(directory, "supplemental-stress.json");
const supplementalStress = (await Bun.file(stressFile).exists())
	? await json(stressFile)
	: null;
const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
const evidence = [];
for (const result of summary.results) {
	const optional = async (name: string) =>
		(await Bun.file(join(directory, result.id, name)).exists())
			? json(join(directory, result.id, name))
			: null;
	const rss = await optional("rss.json");
	const gate = await optional("dx-gate.json");
	const profile = await optional("profile.json");
	const published = await optional("published-gate.json");
	const compilation = await optional("compilation.json");
	const operationSplitting = await optional("operation-splitting.json");
	const dxPassed = result.dxPassed && published?.passed === true;
	const sourceChecks = result.checks.filter(
		(check: { id: string }) =>
			![
				"published-runtime-failure-paths",
				"rss",
				"workload-profile",
			].includes(check.id),
	);
	const stress = supplementalStress?.results.find(
		(entry: { id: string }) => entry.id === result.id,
	);
	const mutableSafe =
		(stress ?? gate?.adversarial)?.mutableArtifactStress === "pass";
	evidence.push({
		...result,
		sourceGatePassed:
			sourceChecks.length >= 7 &&
			sourceChecks.every((check: { passed: boolean }) => check.passed),
		dxPassed,
		publishedRuntimeGate: published ?? {
			passed: false,
			reason: "Published-runtime failure-path coverage was not run for this result.",
		},
		eligibleForReview: dxPassed && mutableSafe,
		eligibleForAdoption: false,
		adoptionStatus:
			"Experimental only; existing RSS policy and implementation review remain separate.",
		...(stress ? { supplementalAdversarial: stress } : {}),
		gate,
		...(compilation ? { compilation } : {}),
		...(operationSplitting ? { operationSplitting } : {}),
		measurements: rss,
		profiles: profile,
		comparison: {
			rss: rss?.entrypoints
				.filter(
					(entry: { classification: string }) =>
						entry.classification === "operational",
				)
				.map(
					(entry: {
						specifier: string;
						importOnly: { deltaMiB: number };
						importPlusOperation: { deltaMiB: number };
					}) => ({
						entrypoint: entry.specifier,
						importMiB: entry.importOnly.deltaMiB,
						operationMiB: entry.importPlusOperation.deltaMiB,
					}),
				),
			workloads: profile?.profiles.map(
				(entry: {
					workload: string;
					size: number;
					samples: {
						coldMs: number;
						msPerOperation: number;
						peakRssBytes: number;
						afterGc: { heapUsed: number };
					}[];
				}) => ({
					workload: entry.workload,
					size: entry.size,
					coldMs: median(
						entry.samples.map((sample) => sample.coldMs),
					),
					warmMsPerOperation: median(
						entry.samples.map((sample) => sample.msPerOperation),
					),
					peakMiB: median(
						entry.samples.map(
							(sample) => sample.peakRssBytes / 1048576,
						),
					),
					postGcHeapMiB: median(
						entry.samples.map(
							(sample) => sample.afterGc.heapUsed / 1048576,
						),
					),
				}),
			),
		},
	});
}
const report = {
	metadata,
	supplementalStress,
	method: {
		productionChanged: false,
		budgetsChanged: false,
		measuredRuntime:
			"Fresh processes loading staged built packages, outside development aliases",
		rss: "Five-process median delta over the empty-module baseline; raw bytes retained",
		profiles:
			"Five fresh processes per workload; cold and warm timings, peak RSS, and post-GC heap",
		gate: "Builds, type/schema consumers, compiler/interpreter tests, generated-validator semantics when present, Dum package contracts, consumer workflows, exported interfaces, published-package failure paths and shared error identity, canonical differential results and exact issues, adversarial cases, and runtime/declaration isolation",
		limitations: [
			"No live models or deployed Convex state",
			"One machine and Bun version",
			"Host load is not controlled; overlapping work can confound wall-clock timings",
			"Projection profiles use a synthetic Synonym chain whose inferred relations become dense; they are not representative of every graph with that many Readings",
			"Mutable artifact stress is stricter than the readonly TypeScript artifact contract",
			"No alternative is adopted into production by this experiment",
		],
	},
	evidence,
};
await writeFile(resolve(destination), `${JSON.stringify(report, null, 2)}\n`);
console.log(
	JSON.stringify(
		evidence.map((entry) => ({
			id: entry.id,
			dxPassed: entry.dxPassed,
			eligibleForReview: entry.eligibleForReview,
			...entry.comparison,
		})),
		null,
		2,
	),
);
