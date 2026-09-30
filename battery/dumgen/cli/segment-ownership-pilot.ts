/** A bounded experiment; defaults to preparation only, and never refetches its baseline. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	createTypeSafeExecutor,
	type Questions,
	type RequestOptions,
	type SystemOneRequest,
	type SystemOneResult,
	type TypeSafeExecutor,
} from "promptsmith/typesafe";
import type { SegmentInUnitsOutput } from "../src/evaluation/spec-corpus/segment-in-units.js";
import type { ArmResult } from "../src/segment-in-units/de/arm.js";
import { runEnvelopes } from "../src/segment-in-units/de/arms/envelopes.js";
import { runOwnership } from "../src/segment-in-units/de/arms/ownership.js";
import {
	type GermanSource,
	segmentGermanSource,
} from "../src/segment-in-units/de/source.js";
import {
	evaluateSourceAndUnits,
	type SourceUnitEvaluation,
	sourceSpans,
} from "../src/segment-in-units/de/source-evaluation.js";
import { type LabCase, loadSet } from "../src/segment-in-units/lab/corpus.js";
import type { CallRecord } from "../src/segment-in-units/lab/jev.js";
import { modeledLatency } from "../src/segment-in-units/lab/metrics.js";
import { PilotBudget } from "../src/segment-in-units/lab/pilot-budget.js";
import { PilotJev } from "../src/segment-in-units/lab/pilot-jev.js";
import { loadLabRun } from "../src/segment-in-units/lab/run.js";

const packageRoot = resolve(import.meta.dir, "..");
const labRoot = join(packageRoot, ".runs", "segment-in-units-lab");
const experimentRoot = "/private/tmp/segment-in-units-investigation-20260930";
const model = "jev-1.13.0";
const baselineId =
	"20260929T074903--candidates2--routes-question_tests-1_gen-3--dev--all";
const baselinePolicy = "full@0.7+family";
const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		live: { type: "boolean", default: false },
		offline: { type: "boolean", default: false },
		mode: { type: "string", default: "gold" },
		arm: { type: "string", default: "ownership" },
		manifest: {
			type: "string",
			default: join(experimentRoot, "pilot32.json"),
		},
		limit: { type: "string", default: "32" },
		reps: { type: "string", default: "3" },
		budget: { type: "string", default: "1" },
		"prior-run": { type: "string" },
		help: { type: "boolean", default: false },
		opt: { type: "string", multiple: true, default: [] },
	},
});
if (values.help) {
	console.log(
		"Segmentation pilot: defaults to preparation only. --arm ownership|envelopes; --live | --offline; --mode gold|source|both; --limit 1..32; --reps 1..3; --budget <=1; --prior-run <completed run.json>; --manifest <pilot manifest>; --opt key=value",
	);
	process.exit(0);
}
if (values.live && values.offline) throw Error("Choose either live or offline");
if (!["ownership", "envelopes"].includes(values.arm))
	throw Error("arm must be ownership or envelopes");
const runExperiment = values.arm === "envelopes" ? runEnvelopes : runOwnership;
if (!["gold", "source", "both"].includes(values.mode))
	throw Error("mode must be gold, source or both");
const limit = Number(values.limit);
const repetitions = Number(values.reps);
if (!Number.isInteger(limit) || limit < 1 || limit > 32)
	throw Error("The first pilot allows 1–32 cases");
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 3)
	throw Error("The first pilot allows 1–3 repetitions");
const options = {
	routes: "question",
	tests: "1",
	singletonRoutes: "all",
	closed: "1",
	...Object.fromEntries(
		values.opt.map((entry) => {
			const [key, ...rest] = entry.split("=");
			return [key ?? "", rest.join("=")];
		}),
	),
};
type Manifest = {
	set: "dev";
	setHash: string;
	selection: string;
	ids: string[];
	representative: string[];
	challenge: string[];
};
const manifest = JSON.parse(
	await readFile(values.manifest, "utf8"),
) as Manifest;
const set = await loadSet(labRoot, "dev");
if (manifest.set !== "dev" || manifest.setHash !== set.hash)
	throw Error("Manifest does not match frozen dev gold");
const selectedIds = manifest.ids.slice(0, limit);
if (new Set(selectedIds).size !== selectedIds.length)
	throw Error("Pilot ids must be unique");
const casesById = new Map(set.cases.map((labCase) => [labCase.id, labCase]));
const cases = selectedIds.map((id) => {
	const labCase = casesById.get(id);
	if (!labCase) throw Error(`Missing frozen case ${id}`);
	return labCase;
});
const baseline = await loadLabRun(labRoot, baselineId);
if (baseline.setHash !== set.hash)
	throw Error("Baseline and selected gold have different hashes");
const baselineById = new Map(
	baseline.cases.map((caseRun) => [caseRun.id, caseRun]),
);
for (const id of selectedIds) {
	const row = baselineById.get(id);
	if (
		!row ||
		row.repetitions.length < repetitions ||
		row.repetitions.some((rep) => !rep.outputs?.[baselinePolicy])
	)
		throw Error(
			`Missing recorded baseline; it will never be refetched: ${id}`,
		);
}
const priorRun = values["prior-run"]
	? (JSON.parse(await readFile(values["prior-run"], "utf8")) as {
			budget: {
				capUsd: number;
				knownUsd: number;
				unknownUsageReservedUsd: number;
				pendingReservedUsd: number;
			};
		})
	: undefined;
if (
	priorRun &&
	(priorRun.budget.pendingReservedUsd !== 0 ||
		priorRun.budget.capUsd !== Number(values.budget))
)
	throw Error(
		"A prior run must have settled reservations and the same cumulative cap",
	);
const budget = new PilotBudget(Number(values.budget), priorRun?.budget);
const modes =
	values.mode === "both"
		? (["gold", "source"] as const)
		: [values.mode as "gold" | "source"];
const runId = `${values.arm}-${new Date().toISOString().replaceAll(":", "-")}`;
const outputDirectory = join(experimentRoot, runId);
await mkdir(outputDirectory, { recursive: true });
const cacheDirectory = join(experimentRoot, "ownership-cache");
const gitHead = execFileSync("git", ["rev-parse", "HEAD"], {
	cwd: packageRoot,
	encoding: "utf8",
}).trim();
const sourcePaths = execFileSync(
	"rg",
	[
		"--files",
		"src/segment-in-units",
		"src/evaluation/spec-corpus/segment-in-units.ts",
		"cli/segment-ownership-pilot.ts",
		"tsconfig.segment-in-units.json",
	],
	{ cwd: packageRoot, encoding: "utf8" },
)
	.trim()
	.split("\n")
	.sort();
const sourceHashes: Record<string, string> = {};
for (const path of sourcePaths) {
	const contents = await readFile(join(packageRoot, path));
	sourceHashes[path] = createHash("sha256").update(contents).digest("hex");
	const copyPath = join(outputDirectory, "provenance", path);
	await mkdir(dirname(copyPath), { recursive: true });
	await writeFile(copyPath, contents);
}
const configuration = {
	runId,
	arm: values.arm,
	model,
	maxRetries: 0,
	concurrency: 2,
	options,
	setHash: set.hash,
	setGitHead: set.gitHead,
	gitHead,
	sourceHashes,
	sourceHash: createHash("sha256")
		.update(JSON.stringify(sourceHashes))
		.digest("hex"),
	manifest: values.manifest,
	selection: manifest.selection,
	ids: selectedIds,
	repetitions,
	modes,
	baseline: {
		runId: baselineId,
		policy: baselinePolicy,
		modelAliasRecorded: baseline.model,
		refetched: false,
		input: "Gold Segments and recovery",
	},
	budgetCapUsd: budget.capUsd,
	priorRun: values["prior-run"] ?? null,
	priorBudget: priorRun?.budget ?? null,
	requestReservationTokens: budget.requestTokenLimit,
	packing:
		"UTF-8 serialized bytes plus 4096 framing allowance; 32K state+question and 64K full request, sequential chunks, no option truncation",
	priceSource: "https://docs.typesafe.ai/models",
	evaluationRevision:
		"Explicit gold surface assertions compare to actual.surface ?? actual.text; redundant identity copies have equivalent meaning. Older immutable runs retain original explicit-field scores.",
	notes: [
		"Repetitions measure noise; production makes one inference per stage and never retries.",
		"Report source-hash representative and challenge samples separately; their combined result is a smoke test.",
		"Foreign and Unresolved gold units are stubs in the official evaluator; report them separately.",
		"Owner route options include legal singleton Locutions; the historical baseline restricted singleton routes.",
	],
};
await writeFile(
	join(outputDirectory, "configuration.json"),
	`${JSON.stringify(configuration, null, 2)}\n`,
);
console.log(
	JSON.stringify(
		{
			...configuration,
			outputDirectory,
			execution: values.live
				? "live"
				: values.offline
					? "offline"
					: "prepared only",
		},
		null,
		2,
	),
);
if (!values.live && !values.offline) process.exit(0);

let upstream: TypeSafeExecutor | undefined;
let requestCount = 0;
const actualModels = new Set<string>();
const executor: TypeSafeExecutor = async <const Q extends Questions>(
	request: SystemOneRequest<Q>,
	requestOptions?: RequestOptions,
) => {
	const settle = budget.reserve();
	const requestId = ++requestCount;
	const requestPath = join(outputDirectory, "requests", `${requestId}.json`);
	await mkdir(dirname(requestPath), { recursive: true });
	await writeFile(
		requestPath,
		`${JSON.stringify({ request, maxRetries: 0 })}\n`,
	);
	upstream ??= createTypeSafeExecutor({ retry: { maxRetries: 0 } });
	let response: SystemOneResult<Q> & { readonly requestId?: string };
	try {
		response = await upstream(request, {
			...requestOptions,
			retry: { maxRetries: 0 },
		});
	} catch (error) {
		settle();
		throw error;
	}
	settle(response.usage.input_tokens);
	actualModels.add(response.model);
	if (response.model !== model)
		throw Error(`Expected pinned ${model}, received ${response.model}`);
	return response;
};
const jev = new PilotJev({
	model,
	maxRetries: 0,
	concurrency: 2,
	cacheDirectory,
	offline: !values.live,
	executor,
});

type Evaluation = {
	known: SourceUnitEvaluation;
	all: SourceUnitEvaluation;
	answeredGoldUnits: number;
};
type Repetition = {
	result?: ArmResult;
	source?: GermanSource;
	evaluations?: Record<string, Evaluation>;
	calls: CallRecord[];
	wallMs: number;
	error?: string;
};
type Row = { id: string; mode: string; repetitions: Repetition[] };
const rows: Row[] = [];
const evaluate = (
	labCase: LabCase,
	source: GermanSource,
	output: SegmentInUnitsOutput,
): Evaluation => {
	const knownGold = {
		units: labCase.idealOutput.units.filter(
			({ route }) => route !== "Unresolved" && route.family !== "Foreign",
		),
	};
	const known = evaluateSourceAndUnits(
		labCase.input,
		knownGold,
		source,
		output,
	);
	const all = evaluateSourceAndUnits(
		labCase.input,
		labCase.idealOutput,
		source,
		output,
		labCase.facts.coverage,
	);
	const goldSpans = sourceSpans(labCase.input.segments);
	let answeredGoldUnits = 0;
	for (const gold of knownGold.units) {
		const touching = output.units.filter((unit) =>
			unit.segments.some((segment) => {
				const span = source.spans[segment];
				return (
					span &&
					gold.segments.some((goldSegment) => {
						const other = goldSpans[goldSegment];
						return (
							other &&
							span.start < other.end &&
							other.start < span.end
						);
					})
				);
			}),
		);
		if (
			touching.length > 0 &&
			touching.every(({ route }) => route !== "Unresolved")
		)
			answeredGoldUnits++;
	}
	return { known, all, answeredGoldUnits };
};

for (const labCase of cases) {
	for (const mode of modes) {
		const row: Row = { id: labCase.id, mode, repetitions: [] };
		rows.push(row);
		for (let repetition = 0; repetition < repetitions; repetition++) {
			const calls: CallRecord[] = [];
			const start = performance.now();
			try {
				const source: GermanSource =
					mode === "source"
						? await segmentGermanSource(
								labCase.input.segments
									.map(({ text }) => text)
									.join(""),
								{ jev, repetition, calls },
							)
						: {
								input: labCase.input,
								spans: sourceSpans(labCase.input.segments),
								unresolved: [],
							};
				const result = await runExperiment(
					source.input,
					{ jev, repetition, calls, options },
					source.unresolved,
				);
				const evaluations = Object.fromEntries(
					Object.entries(result.outputs).map(([policy, output]) => [
						policy,
						evaluate(labCase, source, output),
					]),
				);
				row.repetitions.push({
					result,
					source,
					evaluations,
					calls,
					wallMs: performance.now() - start,
				});
			} catch (error) {
				row.repetitions.push({
					calls,
					wallMs: performance.now() - start,
					error:
						error instanceof Error ? error.message : String(error),
				});
			}
			await writeFile(
				join(outputDirectory, "run.json"),
				`${JSON.stringify({ configuration, budget: budget.snapshot, actualModels: [...actualModels], rows })}\n`,
			);
		}
		console.log(
			`${rows.length}/${cases.length * modes.length} ${mode}: ${labCase.id}; known spend $${budget.snapshot.knownUsd.toFixed(4)}`,
		);
	}
}

const baselineRows: Row[] = cases.map((labCase) => ({
	id: labCase.id,
	mode: "recorded-v3",
	repetitions: (baselineById.get(labCase.id)?.repetitions ?? [])
		.slice(0, repetitions)
		.map((rep) => {
			const source: GermanSource = {
				input: labCase.input,
				spans: sourceSpans(labCase.input.segments),
				unresolved: [],
			};
			const output = rep.outputs?.[baselinePolicy];
			if (!output) throw Error("Baseline output vanished");
			return {
				result: {
					outputs: { [baselinePolicy]: output },
					primary: baselinePolicy,
				},
				source,
				evaluations: {
					[baselinePolicy]: evaluate(labCase, source, output),
				},
				calls: [...rep.calls],
				wallMs: rep.wallMs,
			};
		}),
}));
const ratio = (a: number, b: number) => (b === 0 ? null : a / b);
const quantile = (values: number[], q: number) =>
	values.length === 0
		? null
		: [...values].sort((a, b) => a - b)[
				Math.min(values.length - 1, Math.floor(q * values.length))
			];
function summarize(selected: Row[], policy: string) {
	let gold = 0,
		grouping = 0,
		joint = 0,
		strictRecovery = 0,
		annotatedRecovery = 0,
		abstained = 0,
		unresolved = 0,
		predicted = 0,
		answered = 0,
		errors = 0;
	let exactOutputChanges = 0,
		exactMembershipChanges = 0,
		fullPass = 0,
		fullBase = 0,
		sourceBoundaryExact = 0,
		sourceAnnotatedRecoveryExact = 0;
	let contractPass = 0;
	let completedOnlyOutputVariation = 0,
		completedOnlyMembershipVariation = 0,
		completedOnlyVariationBase = 0,
		completedOnlyKnownUnitPassFailFlips = 0,
		serviceCompletedAttempts = 0;
	let allGoldUnits = 0,
		stubGoldUnits = 0,
		stubGroupingMatches = 0,
		stubRouteMatches = 0,
		knownUnitCasePass = 0,
		knownUnitPassFailFlips = 0,
		partitionContractPassFailFlips = 0;
	let inputTokens = 0,
		freshCalls = 0,
		cachedCalls = 0;
	const wall: number[] = [],
		modeled: number[] = [];
	for (const row of selected) {
		const outputs = new Set<string>(),
			members = new Set<string>();
		const knownPasses = new Set<boolean>(),
			partitionPasses = new Set<boolean>();
		const completeOutputs = new Set<string>(),
			completeMembers = new Set<string>(),
			completeKnownPasses = new Set<boolean>();
		let completed = 0;
		for (const rep of row.repetitions) {
			if (casesById.get(row.id)?.facts.coverage === "Full") fullBase++;
			for (const call of rep.calls) {
				inputTokens += call.inputTokens;
				if (call.cached) cachedCalls++;
				else freshCalls++;
			}
			const ev = rep.evaluations?.[policy];
			const output = rep.result?.outputs[policy];
			wall.push(rep.wallMs);
			modeled.push(modeledLatency(rep.calls));
			if (!ev || !output) {
				errors++;
				const expected = casesById.get(row.id)?.idealOutput.units ?? [];
				const expectedKnown = expected.filter(
					({ route }) =>
						route !== "Unresolved" && route.family !== "Foreign",
				).length;
				gold += expectedKnown;
				allGoldUnits += expected.length;
				stubGoldUnits += expected.length - expectedKnown;
				outputs.add("error");
				members.add("error");
				knownPasses.add(false);
				partitionPasses.add(false);
				continue;
			}
			const counts = ev.known.units;
			completed++;
			serviceCompletedAttempts++;
			gold += counts.gold;
			allGoldUnits += ev.all.units.gold;
			stubGoldUnits += ev.all.units.gold - counts.gold;
			stubGroupingMatches +=
				ev.all.units.groupingMatches - counts.groupingMatches;
			stubRouteMatches += ev.all.units.routeMatches - counts.routeMatches;
			grouping += counts.groupingMatches;
			joint += counts.routeMatches;
			strictRecovery += counts.strictRecoveryMatches;
			annotatedRecovery += counts.annotatedRecoveryMatches;
			abstained += counts.abstained;
			unresolved += counts.unresolved;
			predicted += counts.predicted;
			answered += ev.answeredGoldUnits;
			sourceBoundaryExact += Number(ev.known.source.boundaryExact);
			sourceAnnotatedRecoveryExact += Number(
				ev.known.source.annotatedSurfaceExact,
			);
			contractPass += Number(ev.all.units.contractPass);
			const knownPass =
				counts.gold > 0 && counts.routeMatches === counts.gold;
			knownUnitCasePass += Number(knownPass);
			knownPasses.add(knownPass);
			completeKnownPasses.add(knownPass);
			partitionPasses.add(ev.all.units.contractPass);
			if (casesById.get(row.id)?.facts.coverage === "Full")
				fullPass += Number(ev.all.units.fullPass);
			const serializedOutput = JSON.stringify({
				source: rep.source?.input,
				units: output.units,
			});
			outputs.add(serializedOutput);
			completeOutputs.add(serializedOutput);
			const serializedMembership = JSON.stringify({
				source: rep.source?.spans,
				kinds: rep.source?.input.segments.map(({ kind }) => kind),
				units: output.units.map(({ segments }) => segments),
			});
			members.add(serializedMembership);
			completeMembers.add(serializedMembership);
		}
		exactOutputChanges += Number(outputs.size > 1);
		exactMembershipChanges += Number(members.size > 1);
		knownUnitPassFailFlips += Number(knownPasses.size > 1);
		partitionContractPassFailFlips += Number(partitionPasses.size > 1);
		completedOnlyVariationBase += Number(completed >= 2);
		completedOnlyOutputVariation += Number(completeOutputs.size > 1);
		completedOnlyMembershipVariation += Number(completeMembers.size > 1);
		completedOnlyKnownUnitPassFailFlips += Number(
			completeKnownPasses.size > 1,
		);
	}
	return {
		policy,
		cases: selected.length,
		repetitions,
		goldUnitRepetitions: gold,
		allGoldUnitRepetitions: allGoldUnits,
		goldStubUnitRepetitions: stubGoldUnits,
		stubGroupingMatches,
		stubRouteMatches,
		groupingAccuracy: ratio(grouping, gold),
		jointRouteAccuracy: ratio(joint, gold),
		strictRecoveryJointAccuracy: ratio(strictRecovery, gold),
		annotatedRecoveryJointAccuracy: ratio(annotatedRecovery, gold),
		answeredGoldUnitCoverage: ratio(answered, gold),
		jointAccuracyAmongAnsweredGoldUnits: ratio(joint, answered),
		routeAccuracyAmongResolvedExactGroups: ratio(
			joint,
			grouping - abstained,
		),
		exactGroupsAbstained: abstained,
		unresolvedOutputUnits: unresolved,
		predictedOutputUnits: predicted,
		resolvedOutputUnitCoverage: ratio(predicted - unresolved, predicted),
		exactOutputChanges,
		exactMembershipChanges,
		completedOnlyOutputVariation,
		completedOnlyMembershipVariation,
		completedOnlyVariationBase,
		completedOnlyKnownUnitPassFailFlips,
		serviceCompletedAttempts,
		knownUnitCasePass,
		knownUnitPassFailFlips,
		partitionContractPassFailFlips,
		fullPass,
		fullBase,
		contractPass,
		sourceBoundaryExact,
		sourceAnnotatedRecoveryExact,
		errors,
		inputTokensPerSentenceRepetition: ratio(
			inputTokens,
			selected.length * repetitions,
		),
		freshCalls,
		cachedCalls,
		modeledLatencyMs: {
			p50: quantile(modeled, 0.5),
			p95: quantile(modeled, 0.95),
		},
		wallLatencyMs: { p50: quantile(wall, 0.5), p95: quantile(wall, 0.95) },
	};
}
const policies = [
	...new Set(
		rows.flatMap((row) =>
			row.repetitions.flatMap((rep) =>
				Object.keys(rep.result?.outputs ?? {}),
			),
		),
	),
];
const groups = {
	allSmoke: new Set(selectedIds),
	representative: new Set(manifest.representative),
	challenge: new Set(manifest.challenge),
};
const summary = {
	configuration,
	metricDefinitions: {
		groupingAccuracy:
			"Exact source-span and render-kind member set, irrespective of route or surface recovery; all explicitly annotated known gold units remain the denominator",
		jointRouteAccuracy:
			"Exact member set plus language/family/kind, including abstentions and source failures in the denominator",
		knownUnitCasePass:
			"Every explicitly annotated known gold unit has exact membership and route; excludes Foreign/Unresolved stubs and does not require unannotated units or Full extra-unit checks",
		knownUnitPassFailFlips:
			"Cases whose knownUnitCasePass boolean changes between repetitions; distinct from exact output or membership variation",
		completedOnlyOutputVariation:
			"Cases with different complete output values among at least two successful attempts; transport failures are excluded as output values",
		exactOutputChanges:
			"Cases with different complete output values or an error-as-output among repetitions; consult completedOnlyOutputVariation for semantic noise",
		contractPass:
			"Structural source ownership partition: every clickable source segment is owned exactly once, with no empty units or invalid indices; not semantic correctness",
		stubRouteMatches:
			"Exact membership and route of explicitly annotated Foreign/Unresolved gold targets, reported separately from known-unit accuracy",
		wallLatencyMs:
			"Observed execution including cache reuse; use modeledLatencyMs for architecture comparisons involving caches",
	},
	budget: budget.snapshot,
	actualModels: [...actualModels],
	stubs: cases.reduce(
		(n, labCase) =>
			n +
			labCase.idealOutput.units.filter(
				({ route }) =>
					route === "Unresolved" || route.family === "Foreign",
			).length,
		0,
	),
	metrics: Object.fromEntries(
		Object.entries(groups).map(([sample, ids]) => [
			sample,
			{
				baseline: summarize(
					baselineRows.filter(({ id }) => ids.has(id)),
					baselinePolicy,
				),
				owner: Object.fromEntries(
					modes.map((mode) => [
						mode,
						policies.map((policy) =>
							summarize(
								rows.filter(
									(row) =>
										row.mode === mode && ids.has(row.id),
								),
								policy,
							),
						),
					]),
				),
			},
		]),
	),
};
await writeFile(
	join(outputDirectory, "summary.json"),
	`${JSON.stringify(summary, null, 2)}\n`,
);
console.log(
	JSON.stringify(
		{
			outputDirectory,
			budget: budget.snapshot,
			summaries: policies.length,
			errors: rows
				.flatMap((row) => row.repetitions)
				.filter((rep) => rep.error).length,
		},
		null,
		2,
	),
);
