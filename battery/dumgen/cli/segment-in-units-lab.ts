/**
 * The German `segment.inUnits` lab: freezes the case sets, runs an arm with
 * repetitions, reports and compares runs, measures the noise floor and keeps
 * the ledger and the iteration table.
 *
 *   bun run segment-in-units-lab freeze [--force]
 *   bun run segment-in-units-lab run --arm pairwise --subset smoke --reps 1 [--opt render=tagged]
 *       [--parent <runId>] [--hypothesis "<one line>"] [--allow-dirty] [--model jev-1.13.0]
 *   bun run segment-in-units-lab report --run <runId> [--subset slice300]
 *   bun run segment-in-units-lab compare --left <runId>[:policy] --right <runId>[:policy]
 *       [--noise <noiseRunId>] [--record [--verdict "<text>"]]
 *   bun run segment-in-units-lab noise --run <runId> [--reps 3] [--offset 1000]
 *   bun run segment-in-units-lab sweep --run <runId> [--policy <baseline>] [--replay <runId>[:policy]]
 *   bun run segment-in-units-lab ledger [--table]
 *
 * Frozen sets, raw runs and the answer cache live under
 * `.runs/segment-in-units-lab/` (gitignored). Each run's manifest, outcomes
 * and summary, and the ledger, live under `evidence/segment-in-units-lab/`.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { stableJson } from "promptsmith";
import { compareRuns, loadRun } from "promptsmith/storage";
import { arms } from "../src/segment-in-units/de/arms/index.js";
import {
	deltaBetween,
	focusBetween,
	loadSide,
} from "../src/segment-in-units/lab/compare.js";
import {
	focusOf,
	freezeSets,
	type LabCase,
	loadSet,
	type SetName,
	setPath,
	subset,
} from "../src/segment-in-units/lab/corpus.js";
import {
	readManifest,
	readManifests,
	readOutcomes,
	readSummary,
	runDirectory,
	summaryPath,
	writeManifest,
	writeNoise,
	writeOutcomes,
	writeSummary,
} from "../src/segment-in-units/lab/evidence.js";
import { exportPolicy } from "../src/segment-in-units/lab/export.js";
import {
	type Change,
	type FocusComparison,
	type FocusScore,
	focusGroupLabel,
	focusGroups,
	rateOf,
	scoreFocus,
	type UnitTally,
} from "../src/segment-in-units/lab/focus.js";
import { type CallRecord, Jev } from "../src/segment-in-units/lab/jev.js";
import {
	appendLedger,
	type CompareEntry,
	ledgerTotals,
	readLedger,
	spendOf,
} from "../src/segment-in-units/lab/ledger.js";
import { questionsPerCall } from "../src/segment-in-units/lab/limits.js";
import { Luna } from "../src/segment-in-units/lab/luna.js";
import {
	breakdown,
	byGoldRoute,
	byPhenomenon,
	byRule,
	byShape,
	type CostSummary,
	calibration,
	confusions,
	type PolicySummary,
	policiesOf,
	primaryOf,
	summarizeCost,
	summarizePolicy,
} from "../src/segment-in-units/lab/metrics.js";
import { noiseFloor } from "../src/segment-in-units/lab/noise.js";
import {
	accuracyOf,
	membershipFlipsOf,
	type OutcomeRow,
	outcomePolicies,
	outcomesOf,
} from "../src/segment-in-units/lab/outcomes.js";
import {
	provenanceOf,
	type RunManifest,
} from "../src/segment-in-units/lab/provenance.js";
import {
	conformTo734,
	rerouted,
} from "../src/segment-in-units/lab/ruling734.js";
import {
	loadLabRun,
	runArm,
	saveLabRun,
} from "../src/segment-in-units/lab/run.js";
import { sweepRows, sweepTable } from "../src/segment-in-units/lab/sweep.js";
import {
	type FocusIterationRow,
	focusIterationTable,
	formatP,
	type IterationRow,
	iterationTable,
} from "../src/segment-in-units/lab/table.js";

const packageRoot = resolve(import.meta.dir, "..");
const repository = resolve(packageRoot, "../..");
const cli = "cli/segment-in-units-lab.ts";
const labRoot = join(packageRoot, ".runs", "segment-in-units-lab");
const evidenceRoot = join(packageRoot, "evidence", "segment-in-units-lab");
const ledgerPath = join(evidenceRoot, "ledger.jsonl");
/**
 * The jev stop line in fresh input tokens over the whole ledger, as set for
 * rounds 1 and 2 of #744; `--token-budget` moves it for a new round.
 */
const defaultTokenBudget = 343_000_000;

const { positionals, values } = parseArgs({
	args: Bun.argv.slice(2),
	allowPositionals: true,
	options: {
		arm: { type: "string" },
		set: { type: "string", default: "dev" },
		subset: { type: "string" },
		reps: { type: "string" },
		concurrency: { type: "string", default: "12" },
		opt: { type: "string", multiple: true, default: [] },
		limit: { type: "string" },
		offline: { type: "boolean", default: false },
		force: { type: "boolean", default: false },
		run: { type: "string" },
		policy: { type: "string" },
		left: { type: "string" },
		right: { type: "string" },
		qpc: { type: "string" },
		tag: { type: "string" },
		sizes: { type: "string", default: "25,100,400,2000" },
		relabel: { type: "string" },
		parent: { type: "string" },
		hypothesis: { type: "string" },
		"allow-dirty": { type: "boolean", default: false },
		"allow-drift": { type: "boolean", default: false },
		model: { type: "string" },
		"allow-floating-model": { type: "boolean", default: false },
		"token-budget": { type: "string" },
		offset: { type: "string" },
		noise: { type: "string" },
		replay: { type: "string" },
		record: { type: "boolean", default: false },
		verdict: { type: "string" },
		table: { type: "boolean", default: false },
	},
});

const percent = (value: number) =>
	Number.isNaN(value) ? "–" : `${(100 * value).toFixed(1)}`;

/** The cases by id, read against the #734 ruling when `--relabel 734`. */
function casesOf(cases: readonly LabCase[]): Map<string, LabCase> {
	const read =
		values.relabel === "734" ? conformTo734 : (labCase: LabCase) => labCase;
	return new Map(cases.map((labCase) => [labCase.id, read(labCase)]));
}

const plainCases = (cases: readonly LabCase[]) =>
	new Map(cases.map((labCase) => [labCase.id, labCase]));

async function freeze() {
	for (const name of ["dev", "heldout"] as const)
		if (existsSync(setPath(labRoot, name)) && !values.force)
			throw Error(`${name} is frozen already; pass --force to refreeze`);
	for (const set of await freezeSets(labRoot, repository))
		console.log(
			`${set.name}: ${set.cases.length} cases, hash ${set.hash}, git ${set.gitHead.slice(0, 8)}, ${set.dirtyRecordFiles} uncommitted record files`,
		);
}

function optionsOf(entries: readonly string[]): Record<string, string> {
	return Object.fromEntries(
		entries.map((entry) => {
			const [key, ...rest] = entry.split("=");
			return [key ?? "", rest.join("=")];
		}),
	);
}

type Provenance = Awaited<ReturnType<typeof provenanceOf>>;

/** Refuses a dirty tree unless `--allow-dirty`, and then says so loudly. */
function guardDirty(provenance: Provenance) {
	if (!provenance.dirty) return;
	const files = provenance.dirtyFiles.map((line) => `  ${line}`).join("\n");
	if (!values["allow-dirty"])
		throw Error(
			`Uncommitted changes in the lab's sources:\n${files}\nCommit them first, or pass --allow-dirty to record the run as dirty with a diff.patch.`,
		);
	console.warn(
		`\n*** DIRTY TREE: this run records dirty: true and a diff.patch; gitHead alone does not name its code.\n${files}\n`,
	);
}

/**
 * Runs an arm and writes everything a run leaves: the raw run, the
 * manifest, the outcomes, the ledger line and the summary.
 */
async function execute(args: {
	readonly kind: "run" | "noise";
	readonly armId: string;
	readonly options: Readonly<Record<string, string>>;
	readonly setName: SetName;
	readonly subsetName: string;
	readonly limit: number | null;
	readonly repetitions: number;
	readonly repetitionOffset: number;
	readonly parent: string | null;
	readonly hypothesis: string | null;
	readonly baseline?: string;
	readonly provenance: Provenance;
	readonly model?: string;
}) {
	const arm = arms[args.armId];
	if (!arm)
		throw Error(`--arm must be one of ${Object.keys(arms).join(", ")}`);
	const set = await loadSet(labRoot, args.setName);
	let cases = subset(set, args.subsetName);
	if (args.limit !== null) cases = cases.slice(0, args.limit);
	const tokenBudget = Number(values["token-budget"] ?? defaultTokenBudget);
	const spentBefore = ledgerTotals(
		await readLedger(ledgerPath),
	).jevFreshInputTokens;
	let spentNow = 0;
	const beforeSpend = () => {
		if (spentBefore + spentNow >= tokenBudget)
			throw Error(
				`jev token budget line reached: ${spentBefore + spentNow} of ${tokenBudget} fresh input tokens`,
			);
	};
	const jev = new Jev({
		cacheDirectory: join(labRoot, "cache"),
		concurrency: Number(values.concurrency),
		...(values.qpc ? { questionsPerCall: Number(values.qpc) } : {}),
		...(args.model ? { model: args.model } : {}),
		allowFloatingModel: values["allow-floating-model"],
		offline: values.offline,
		beforeSpend,
		onSpend: (tokens) => {
			spentNow += tokens;
		},
	});
	const luna = arm.usesLuna
		? new Luna({
				cacheDirectory: join(labRoot, "cache"),
				concurrency: 6,
				offline: values.offline,
			})
		: undefined;
	const slug = Object.entries(args.options)
		.map(([key, value]) => `${key}-${value}`)
		.join("_")
		.replace(/[^a-zA-Z0-9_-]/gu, "-");
	const stamp = new Date().toISOString().replace(/[-:]/gu, "").slice(0, 15);
	const runId = [
		stamp,
		arm.id,
		slug,
		set.name,
		args.subsetName,
		args.kind === "noise" ? `noise${args.repetitionOffset}` : undefined,
		values.tag,
	]
		.filter(Boolean)
		.join("--");
	console.log(
		`${runId}: ${cases.length} cases × ${args.repetitions} (repetitions from ${args.repetitionOffset}), model ${jev.model}, ledger so far ${spentBefore} fresh jev input tokens`,
	);
	let last = 0;
	const labRun = await runArm({
		runId,
		arm,
		options: args.options,
		set,
		subset: args.subsetName,
		cases,
		repetitions: args.repetitions,
		repetitionOffset: args.repetitionOffset,
		jev,
		...(luna ? { luna } : {}),
		concurrency: Number(values.concurrency),
		gitHead: args.provenance.gitHead,
		codeHash: args.provenance.codeHash,
		dirty: args.provenance.dirty,
		onProgress(done, total) {
			if (
				done - last >= Math.max(1, Math.floor(total / 10)) ||
				done === total
			) {
				last = done;
				process.stderr.write(
					`  ${done}/${total} (${spentNow} fresh tokens)\n`,
				);
			}
		},
	});
	await saveLabRun(labRoot, labRun);
	const { patch, ...provenance } = args.provenance;
	const promptHashes = {
		...Object.fromEntries(
			Object.entries(jev.promptHashes()).map(([stage, hash]) => [
				`jev/${stage}`,
				hash,
			]),
		),
		...Object.fromEntries(
			Object.entries(luna?.promptHashes() ?? {}).map(([stage, hash]) => [
				`luna/${stage}`,
				hash,
			]),
		),
	};
	const manifest: RunManifest = {
		runId,
		kind: args.kind,
		createdAt: labRun.startedAt,
		parent: args.parent,
		hypothesis: args.hypothesis,
		...provenance,
		promptHashes,
		modelRequested: jev.model,
		modelResolved: [...jev.resolvedModels].sort(),
		arm: arm.id,
		options: args.options,
		primary: primaryOf(labRun),
		set: { name: set.name, hash: set.hash },
		subset: args.subsetName,
		limit: args.limit,
		cases: cases.length,
		repetitions: args.repetitions,
		repetitionOffset: args.repetitionOffset,
		...(args.baseline ? { baseline: args.baseline } : {}),
	};
	await writeManifest(evidenceRoot, manifest, patch);
	const outcomes = outcomesOf(labRun, plainCases(set.cases));
	await writeOutcomes(evidenceRoot, runId, outcomes);
	const calls = labRun.cases.flatMap((caseRun) =>
		caseRun.repetitions.flatMap((repetition) => repetition.calls),
	);
	const spend = spendOf(calls);
	await appendLedger(ledgerPath, {
		runId,
		at: new Date().toISOString(),
		command: args.kind,
		arm: arm.id,
		options: args.options,
		set: set.name,
		setHash: set.hash,
		subset: args.subsetName,
		cases: cases.length,
		repetitions: args.repetitions,
		gitHead: manifest.gitHead,
		dirty: manifest.dirty,
		codeHash: manifest.codeHash,
		model: manifest.modelResolved.join(",") || manifest.modelRequested,
		parent: args.parent,
		hypothesis: args.hypothesis,
		...spend,
	});
	console.log(
		`jev fresh ${spend.jev.freshInputTokens} input tokens, luna fresh ${spend.luna.freshInputTokens}/${spend.luna.freshOutputTokens} tokens`,
	);
	await report(runId);
	return { manifest, outcomes };
}

async function run() {
	const provenance = await provenanceOf({ packageRoot, repository, cli });
	guardDirty(provenance);
	if (values.parent && !(await readManifest(evidenceRoot, values.parent)))
		console.warn(
			`--parent ${values.parent} has no committed manifest; the table cannot compare against it`,
		);
	await execute({
		kind: "run",
		armId: values.arm ?? "",
		options: optionsOf(values.opt ?? []),
		setName: values.set as SetName,
		subsetName: values.subset ?? "smoke",
		limit: values.limit ? Number(values.limit) : null,
		repetitions: Number(values.reps ?? "3"),
		repetitionOffset: 0,
		parent: values.parent ?? null,
		hypothesis: values.hypothesis ?? null,
		provenance,
		...(values.model ? { model: values.model } : {}),
	});
}

/**
 * Reruns a baseline's exact configuration at fresh repetition indices and
 * records the per-bucket flip rate against it for every policy.
 */
async function noise() {
	const baselineId = values.run ?? "";
	const baseline = await readManifest(evidenceRoot, baselineId);
	const baselineRows = await readOutcomes(evidenceRoot, baselineId);
	if (!baseline || !baselineRows)
		throw Error(
			`--run ${baselineId} needs a committed manifest and outcomes; runs made before manifests cannot be rerun exactly`,
		);
	const provenance = await provenanceOf({ packageRoot, repository, cli });
	guardDirty(provenance);
	const drift = [
		provenance.codeHash !== baseline.codeHash ? "code" : "",
		provenance.dumspecHash !== baseline.dumspecHash ? "dumspec" : "",
	].filter(Boolean);
	if (drift.length > 0 && !values["allow-drift"])
		throw Error(
			`The ${drift.join(" and ")} changed since ${baselineId}; a rerun would not measure its noise. Pass --allow-drift to rerun anyway.`,
		);
	const earlier = (await readManifests(evidenceRoot)).filter(
		(manifest) => manifest.baseline === baselineId,
	).length;
	// Fresh indices miss every cached answer of the baseline and earlier reruns.
	const repetitionOffset = Number(values.offset ?? 1000 * (earlier + 1));
	if (
		!Number.isInteger(repetitionOffset) ||
		repetitionOffset < baseline.repetitionOffset + baseline.repetitions
	)
		throw Error("--offset must lie past the baseline's repetitions");
	const { manifest, outcomes } = await execute({
		kind: "noise",
		armId: baseline.arm,
		options: baseline.options,
		setName: baseline.set.name as SetName,
		subsetName: baseline.subset,
		limit: baseline.limit,
		repetitions: Number(values.reps ?? baseline.repetitions),
		repetitionOffset,
		parent: baselineId,
		hypothesis: `noise floor of ${baselineId}`,
		baseline: baselineId,
		provenance,
		model: baseline.modelRequested,
	});
	const promptsMatch =
		stableJson(manifest.promptHashes) === stableJson(baseline.promptHashes);
	const floors = Object.fromEntries(
		outcomePolicies(baselineRows).map((policy) => [
			policy,
			noiseFloor(baselineRows, outcomes, policy),
		]),
	);
	await writeNoise(evidenceRoot, {
		baseline: baselineId,
		rerun: manifest.runId,
		promptsMatch,
		floors,
	});
	if (!promptsMatch)
		console.warn(
			"\n*** The rerun sent different prompts than the baseline; its flips measure a changed configuration, not noise.\n",
		);
	const floor = floors[baseline.primary] ?? {};
	console.log(`noise floor of ${baselineId} (${baseline.primary}):`);
	for (const [bucket, rate] of Object.entries(floor).sort(
		(a, b) => b[1].units - a[1].units,
	))
		console.log(
			`  ${bucket.padEnd(24)} units ${String(rate.units).padStart(5)}  flips ${String(rate.flips).padStart(4)}  ${percent(rate.rate).padStart(5)}%`,
		);
}

type RunSummary = {
	readonly primary: string;
	readonly policies: readonly PolicySummary[];
	readonly cost: CostSummary;
};

async function report(runId: string) {
	const labRun = await loadLabRun(labRoot, runId);
	const set = await loadSet(labRoot, labRun.set as SetName);
	const cases = casesOf(set.cases);
	if (values.relabel === "734")
		console.log(
			`read against the #734 ruling: ${rerouted(set.cases)} one-piece gold units re-routed`,
		);
	const only =
		values.subset && values.run
			? new Set(subset(set, values.subset).map(({ id }) => id))
			: undefined;
	const policies = policiesOf(labRun);
	const primary = values.policy ?? primaryOf(labRun);
	const rows = policies.map((policy) =>
		summarizePolicy(labRun, cases, policy, only),
	);
	const cost = summarizeCost(labRun, only);
	console.log(
		`\n${runId} (${rows[0]?.cases ?? 0} cases × ${labRun.repetitions}, set ${labRun.set}@${labRun.setHash})`,
	);
	// ADR 0008: membership first, then its consistency, then the route.
	console.log(
		`${"policy".padEnd(30)}   mem% multiMem% singleMem%  memFlips   tol% route|mem tol%  strict% route|mem%   case%     full% caseFlips varying  M/A/R/S/Mi/Stub  split/merged/crossed  mem% by rep`,
	);
	for (const row of rows) {
		const { rates, tally } = row;
		console.log(
			[
				row.policy.padEnd(30),
				percent(rates.membership).padStart(6),
				percent(rates.multiMembership).padStart(9),
				percent(rates.singleMembership).padStart(10),
				`${row.membershipFlips}/${row.membershipFlipBase}`.padStart(9),
				percent(rates.tolerantUnitAccuracy).padStart(6),
				percent(rates.tolerantRouteGivenMembership).padStart(13),
				percent(rates.unitAccuracy).padStart(8),
				percent(rates.routeGivenMembership).padStart(10),
				percent(rates.casePass).padStart(7),
				`${percent(rates.fullPass)}(${tally.fullCases / row.repetitions})`.padStart(
					9,
				),
				`${row.flips}/${row.flipBase}`.padStart(9),
				String(row.varyingOutputs).padStart(7),
				` ${tally.match}/${tally.toleratedRoute}/${tally.wrongRoute - tally.toleratedRoute}/${tally.wrongSegments}/${tally.missing}/${tally.stub}`.padEnd(
					17,
				),
				`${tally.split}/${tally.merged}/${tally.crossed}`.padEnd(21),
				row.membershipByRepetition.map(percent).join(" "),
			].join(" "),
		);
	}
	console.log(
		"mem%: gold Segment set exact, any route; memFlips: units whose membership differs between repetitions; tol%: membership with a same or tolerated route (ADR 0008); strict%: same route too; case%: contract (membership) passes",
	);
	const focus = focusOf({ name: labRun.set, hash: labRun.setHash });
	const focusScore = focus
		? scoreFocus(outcomesOf(labRun, cases), primary, focus, only)
		: undefined;
	if (focusScore) printFocusScore(focusScore);
	console.log(
		`cost: ${cost.jevInputTokensPerSentence.toFixed(0)} jev input tokens/sentence, ${cost.jevCallsPerSentence.toFixed(2)} calls, ${cost.jevQuestionsPerSentence.toFixed(1)} questions; luna ${cost.lunaCallsPerSentence.toFixed(2)} calls ${cost.lunaInputTokensPerSentence.toFixed(0)}/${cost.lunaOutputTokensPerSentence.toFixed(0)} tokens; latency p50 ${cost.latencyP50.toFixed(0)} ms p95 ${cost.latencyP95.toFixed(0)} ms; ${cost.errors} errors`,
	);
	const routeBreakdown = breakdown(labRun, cases, primary, byGoldRoute, only);
	const shapeBreakdown = breakdown(labRun, cases, primary, byShape, only);
	const ruleBreakdown = breakdown(labRun, cases, primary, byRule, only);
	const phenomenonBreakdown = breakdown(
		labRun,
		cases,
		primary,
		byPhenomenon,
		only,
	);
	const show = (
		title: string,
		table: ReturnType<typeof breakdown>,
		minimum = 1,
	) => {
		console.log(`${title} (${primary}): key scored mem% tol% strict%`);
		for (const [key, entry] of Object.entries(table)
			.filter(([, entry]) => entry.scored >= minimum)
			.sort((a, b) => b[1].scored - a[1].scored))
			console.log(
				`  ${key.padEnd(48)} ${String(entry.scored).padStart(5)} ${percent(entry.membership / entry.scored).padStart(6)} ${percent(entry.tolerant / entry.scored).padStart(6)} ${percent(entry.match / entry.scored).padStart(6)}`,
			);
	};
	show("by gold route", routeBreakdown);
	show("by unit shape", shapeBreakdown);
	show("by cited Rule", ruleBreakdown, 9);
	show("by phenomenon", phenomenonBreakdown, 3);
	const confused = [...confusions(labRun, cases, primary, only)].sort(
		(a, b) => b[1].count - a[1].count,
	);
	const routeErrors = confused.reduce(
		(total, [, entry]) => total + entry.count,
		0,
	);
	const byPair = new Map<string, number>();
	for (const [, entry] of confused)
		if (entry.tolerated)
			byPair.set(
				entry.tolerated,
				(byPair.get(entry.tolerated) ?? 0) + entry.count,
			);
	const tolerated = [...byPair.values()].reduce(
		(total, count) => total + count,
		0,
	);
	console.log(
		`route errors given membership (${primary}, summed over reps): ${routeErrors}, tolerated ${tolerated} (${[
			...byPair,
		]
			.map(([pair, count]) => `${pair} ${count}`)
			.join(", ")})`,
	);
	console.log(
		`route confusions, ~ marks a tolerated pair: ${confused
			.slice(0, 18)
			.map(
				([key, entry]) =>
					`${entry.tolerated ? "~" : ""}${key} ${entry.count}`,
			)
			.join("; ")}`,
	);
	const calibrated = calibration(labRun, cases, only);
	const bins = (title: string, table: typeof calibrated.routes) =>
		console.log(
			`${title}: ${table.bins
				.filter((bin) => bin.count > 0)
				.map(
					(bin) =>
						`[${bin.from.toFixed(2)},${bin.to.toFixed(2)}) ${bin.correct}/${bin.count}=${percent(bin.correct / bin.count)}`,
				)
				.join("  ")}`,
		);
	bins("route confidence vs correct", calibrated.routes);
	console.log(
		`route risk-coverage (floor kept% acc%): ${calibrated.routes.riskCoverage.map((point) => `${point.floor} ${percent(point.kept)} ${percent(point.accuracy)}`).join(" | ")}`,
	);
	if (calibrated.linkCount > 0)
		bins(
			`link probability vs truly linked (${calibrated.linkCount})`,
			calibrated.links,
		);
	const variant = [
		values.subset && values.run ? values.subset : "",
		values.relabel ? `relabel-${values.relabel}` : "",
	]
		.filter(Boolean)
		.join("--");
	const summary = {
		runId,
		arm: labRun.arm,
		options: labRun.options,
		set: labRun.set,
		setHash: labRun.setHash,
		setGitHead: labRun.setGitHead,
		subset: values.subset && values.run ? values.subset : labRun.subset,
		gitHead: labRun.gitHead,
		repetitions: labRun.repetitions,
		model: labRun.model,
		primary,
		policies: rows,
		...(focusScore ? { focus: focusScore } : {}),
		cost,
		routeErrors: {
			policy: primary,
			total: routeErrors,
			tolerated,
			byPair: Object.fromEntries(byPair),
			confusions: Object.fromEntries(confused),
		},
		breakdowns: {
			phenomenon: phenomenonBreakdown,
			route: routeBreakdown,
			shape: shapeBreakdown,
			rule: ruleBreakdown,
		},
		calibration: calibrated,
	};
	if (await readManifest(evidenceRoot, runId))
		await writeSummary(summaryPath(evidenceRoot, runId, variant), summary);
	else {
		// A run made before manifests keeps its summary beside the historical ones.
		await mkdir(join(evidenceRoot, "summaries"), { recursive: true });
		await writeSummary(
			join(
				evidenceRoot,
				"summaries",
				`${runId}${variant ? `--${variant}` : ""}.json`,
			),
			summary,
		);
	}
}

const focusLine = (label: string, cells: readonly string[]) =>
	console.log(`  ${label.padEnd(44)} ${cells.join(" ")}`);

/** The focus block of a report (#761): the focus units, by #755 cause, and the guardrail. */
function printFocusScore(score: FocusScore) {
	console.log(
		`focus units (${score.focusSet}, ${score.policy}): held and wrong by majority, membership flips; mem% and tol% summed over repetitions`,
	);
	focusLine("", ["units", " held", "wrong", "flips", "  mem%", "  tol%"]);
	const line = (label: string, tally: UnitTally) =>
		focusLine(label, [
			String(tally.units).padStart(5),
			String(tally.held).padStart(5),
			String(tally.units - tally.held).padStart(5),
			String(tally.flips).padStart(5),
			percent(rateOf(tally, "membership")).padStart(6),
			percent(rateOf(tally, "tolerant")).padStart(6),
		]);
	line("focus", score.focus);
	for (const group of focusGroups)
		line(`  ${focusGroupLabel(group)}`, score.groups[group]);
	line("guardrail: other units of the focus cases", score.guardrail);
	if (score.otherCases.units > 0)
		line("guardrail: units of other cases", score.otherCases);
}

/** The focus block of a comparison (#761): per unit, what changed from left to right. */
function printFocusComparison(comparison: FocusComparison) {
	const { left, right, delta } = comparison;
	console.log(
		`focus units (${left.focusSet}), membership by majority, left → right; fixed: wrong → held, broken: held → wrong, stabilised: flipping → not`,
	);
	focusLine("", [
		"units",
		"  held L → R",
		" flips L → R",
		"   tol% L → R",
		"fixed",
		"broken",
		"stabilised",
		"destabilised",
		"p",
	]);
	const arrow = (a: string, b: string, width: number) =>
		`${a} → ${b}`.padStart(width);
	const line = (
		label: string,
		[l, r]: readonly [UnitTally, UnitTally],
		change: (typeof delta)["focus"],
	) =>
		focusLine(label, [
			String(change.units).padStart(5),
			arrow(String(l.held), String(r.held), 12),
			arrow(String(l.flips), String(r.flips), 12),
			arrow(
				percent(rateOf(l, "tolerant")),
				percent(rateOf(r, "tolerant")),
				14,
			),
			String(change.fixed).padStart(5),
			String(change.broken).padStart(6),
			String(change.stabilised).padStart(10),
			String(change.destabilised).padStart(12),
			formatP(change.p),
		]);
	line("focus", [left.focus, right.focus], delta.focus);
	for (const group of focusGroups)
		line(
			`  ${focusGroupLabel(group)}`,
			[left.groups[group], right.groups[group]],
			delta.groups[group],
		);
	line(
		"guardrail: other units of the focus cases",
		[left.guardrail, right.guardrail],
		delta.guardrail,
	);
	if (delta.otherCases.units > 0)
		line(
			"guardrail: units of other cases",
			[left.otherCases, right.otherCases],
			delta.otherCases,
		);
	for (const scope of ["focus", "guardrail"] as const)
		for (const change of [
			"fixed",
			"broken",
			"stabilised",
			"destabilised",
		] as const satisfies readonly Change[]) {
			const units = comparison.changed.filter(
				(unit) =>
					(scope === "focus") === (unit.scope === "focus") &&
					unit.changes.includes(change),
			);
			if (units.length > 0)
				console.log(
					`  ${scope} ${change}: ${units
						.slice(0, Number(values.limit ?? 25))
						.map(
							(unit) =>
								`${unit.text} ${unit.gold}${unit.group ? ` (${unit.group})` : ""}`,
						)
						.join(" | ")}`,
				);
		}
}

async function compare() {
	const [leftId = "", leftPolicy] = (values.left ?? "").split(":");
	const [rightId = "", rightPolicy] = (values.right ?? "").split(":");
	if (!leftId || !rightId) throw Error("--left and --right name runs");
	const setCases = async (setName: string) =>
		casesOf((await loadSet(labRoot, setName as SetName)).cases);
	const side = (runId: string, policy: string | undefined) =>
		loadSide({
			labRoot,
			evidenceRoot,
			runId,
			...(policy ? { policy } : {}),
			casesOf: setCases,
			relabeled: values.relabel !== undefined,
		});
	const left = await side(leftId, leftPolicy);
	const right = await side(rightId, rightPolicy);
	for (const entry of [left, right])
		if (!entry.raw)
			console.log(
				`${entry.runId}: raw run missing; comparing its committed outcomes`,
			);
	const only = values.subset
		? new Set(
				subset(
					await loadSet(labRoot, left.setName as SetName),
					values.subset,
				).map(({ id }) => id),
			)
		: undefined;
	const deltaOptions = {
		...(only ? { only } : {}),
		...(values.noise ? { noiseRun: values.noise } : {}),
	};
	// ADR 0008: membership leads; the route scores follow.
	const { paired, noise, all, buckets } = await deltaBetween(
		evidenceRoot,
		left,
		right,
		deltaOptions,
	);
	const floorText = (floor: number | null, beyond: boolean | null) =>
		floor === null
			? ""
			: `  floor ${floor.toFixed(1)} ${beyond ? "BEYOND NOISE" : "within noise"}`;
	console.log(
		`membership, gold units by majority over repetitions: both hold ${paired.both}, neither ${paired.neither}, left only ${all.lost}, right only ${all.gained}`,
	);
	console.log(
		`  McNemar p = ${formatP(all.p)}${floorText(all.floor, all.beyondNoise)}`,
	);
	const scopedRows = (rows: readonly OutcomeRow[]) =>
		only ? rows.filter((row) => only.has(row.case)) : rows;
	const consistency = [left, right].map((entry) =>
		membershipFlipsOf(scopedRows(entry.rows), entry.policy),
	);
	console.log(
		`consistency, units whose membership flips between repetitions: left ${consistency[0]?.flips}/${consistency[0]?.base}, right ${consistency[1]?.flips}/${consistency[1]?.base}`,
	);
	for (const measure of ["tolerant", "strict"] as const) {
		const delta = await deltaBetween(evidenceRoot, left, right, {
			...deltaOptions,
			measure,
		});
		console.log(
			`${measure === "tolerant" ? "tolerant route (ADR 0008)" : "strict (route equal)"}: left ${percent(accuracyOf(scopedRows(left.rows), left.policy, measure))}%, right ${percent(accuracyOf(scopedRows(right.rows), right.policy, measure))}%; +${delta.all.gained} −${delta.all.lost}, p ${formatP(delta.all.p)}${floorText(delta.all.floor, delta.all.beyondNoise)}`,
		);
	}
	const focus = focusBetween(left, right, only);
	if (focus) printFocusComparison(focus);
	console.log("membership by bucket:");
	console.log(
		noise
			? `noise floor from ${noise.record.rerun} (rerun of ${noise.record.baseline})${noise.record.promptsMatch ? "" : ", WHOSE PROMPTS DIFFERED"}`
			: `no noise floor; measure one with: noise --run ${left.runId}`,
	);
	for (const [bucket, delta] of Object.entries(buckets).sort(
		(a, b) => b[1].units - a[1].units,
	)) {
		const tally = paired.buckets[bucket];
		if (!tally) continue;
		console.log(
			`  ${bucket.padEnd(24)} units ${String(delta.units).padStart(4)}  left ${percent(tally.left / tally.units).padStart(5)}  right ${percent(tally.right / tally.units).padStart(5)}  +${delta.gained} −${delta.lost}  p ${formatP(delta.p)}${floorText(delta.floor, delta.beyondNoise)}`,
		);
	}
	for (const [sideName, list] of [
		["left only", paired.leftOnly],
		["right only", paired.rightOnly],
	] as const)
		console.log(
			`  ${sideName}: ${list
				.slice(0, Number(values.limit ?? 25))
				.map((entry) => entry.text)
				.join(" | ")}`,
		);
	if (left.raw && right.raw) await compareCases(left, right, only);
	if (values.record) {
		const entry: CompareEntry = {
			at: new Date().toISOString(),
			command: "compare",
			left: { runId: left.runId, policy: left.policy },
			right: { runId: right.runId, policy: right.policy },
			subset: values.subset ?? null,
			noiseRun: noise?.record.rerun ?? null,
			verdict: values.verdict ?? null,
			...all,
			buckets,
			...(focus ? { focus: focus.delta } : {}),
		};
		await appendLedger(ledgerPath, entry);
		console.log("recorded in the ledger");
	}
}

/** Case verdicts through promptsmith's `compareRuns`; needs both raw runs. */
async function compareCases(
	left: Awaited<ReturnType<typeof loadSide>>,
	right: Awaited<ReturnType<typeof loadSide>>,
	only: ReadonlySet<string> | undefined,
) {
	const directory = join(labRoot, "promptsmith");
	const exported = [];
	for (const entry of [left, right]) {
		if (!entry.raw) return;
		const set = await loadSet(labRoot, entry.raw.set as SetName);
		const cases = new Map(
			[...casesOf(set.cases)].filter(([id]) => !only || only.has(id)),
		);
		const evaluation = await exportPolicy({
			run: entry.raw,
			cases,
			policy: entry.policy,
			directory,
		});
		exported.push(await loadRun(directory, evaluation.manifest.runId));
	}
	const [leftRun, rightRun] = exported;
	if (!leftRun || !rightRun) return;
	const comparison = compareRuns(leftRun, rightRun);
	const verdicts = comparison.cases.filter((entry) => entry.verdictChanged);
	const count = (side: "left" | "right", verdict: string) =>
		comparison.cases.filter((entry) => entry.verdict[side] === verdict)
			.length;
	for (const side of ["left", "right"] as const)
		console.log(
			`${side}: Passed ${count(side, "Passed")} Failed ${count(side, "Failed")} Mixed ${count(side, "Mixed")} Unscored ${count(side, "Unscored")}`,
		);
	console.log(
		`same corpus: ${comparison.sameCorpus}; changed verdicts ${verdicts.length}; changed outputs ${comparison.changedOutputs.length}`,
	);
	const cases = casesOf(
		(await loadSet(labRoot, left.setName as SetName)).cases,
	);
	for (const entry of verdicts.slice(0, Number(values.limit ?? 40))) {
		const labCase = cases.get(entry.caseId);
		const text =
			labCase?.input.segments.map(({ text }) => text).join("") ?? "";
		console.log(
			`  ${entry.verdict.left} → ${entry.verdict.right}  ${entry.caseId}\n      ${text.slice(0, 160)}`,
		);
	}
}

/**
 * Reads every policy of one run against a baseline policy (#762): the
 * sweep table, written beside the run's evidence. `--replay` also counts
 * the case-repetitions whose baseline output equals another run's.
 */
async function sweep() {
	const runId = values.run ?? "";
	const labRun = await loadLabRun(labRoot, runId);
	const set = await loadSet(labRoot, labRun.set as SetName);
	const focus = focusOf({ name: labRun.set, hash: labRun.setHash });
	if (!focus)
		throw Error(
			`${runId} ran on ${labRun.set}@${labRun.setHash}, not the set the membership focus set was taken from`,
		);
	const cases = plainCases(set.cases);
	const baseline = values.policy ?? primaryOf(labRun);
	const policies = policiesOf(labRun);
	const unrouted = Object.fromEntries(
		policies.map((policy) => [
			policy,
			labRun.cases.reduce(
				(total, caseRun) =>
					total +
					caseRun.repetitions.reduce(
						(sum, repetition) =>
							sum +
							(repetition.outputs?.[policy]?.units.filter(
								(unit) => unit.route === "Unresolved",
							).length ?? 0),
						0,
					),
				0,
			),
		]),
	);
	const rows = sweepRows({
		rows: outcomesOf(labRun, cases),
		summaries: policies.map((policy) =>
			summarizePolicy(labRun, cases, policy),
		),
		baseline,
		focus,
		unrouted,
	});
	let replay:
		| {
				readonly against: string;
				readonly identical: number;
				readonly total: number;
		  }
		| undefined;
	if (values.replay) {
		const [againstId = "", againstPolicy] = values.replay.split(":");
		const against = await loadLabRun(labRoot, againstId);
		const policy = againstPolicy ?? primaryOf(against);
		const recorded = new Map(
			against.cases.map((entry) => [entry.id, entry]),
		);
		let identical = 0;
		let total = 0;
		for (const caseRun of labRun.cases)
			for (const [index, repetition] of caseRun.repetitions.entries()) {
				total++;
				const other = recorded.get(caseRun.id)?.repetitions[index];
				const output = repetition.outputs?.[baseline];
				if (
					output &&
					stableJson(output) === stableJson(other?.outputs?.[policy])
				)
					identical++;
			}
		replay = { against: `${againstId}:${policy}`, identical, total };
		console.log(
			`replay: ${identical} of ${total} case-repetitions of ${baseline} are identical to ${replay.against}`,
		);
	}
	const table = sweepTable(rows, baseline);
	process.stdout.write(table);
	const directory = runDirectory(evidenceRoot, runId);
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "sweep.md"), table);
	await writeFile(
		join(directory, "sweep.json"),
		`${JSON.stringify({ runId, baseline, ...(replay ? { replay } : {}), rows }, null, "\t")}\n`,
	);
}

async function ledger() {
	const entries = await readLedger(ledgerPath);
	if (values.table) {
		process.stdout.write(iterationTable(await iterationRows(entries)));
		const focusRows = await focusIterationRows(entries);
		if (focusRows.length > 0)
			process.stdout.write(`\n${focusIterationTable(focusRows)}`);
		return;
	}
	const totals = ledgerTotals(entries);
	console.log(
		`${entries.length} entries; jev fresh input ${totals.jevFreshInputTokens} tokens (stop line ${values["token-budget"] ?? defaultTokenBudget}); luna fresh ${totals.lunaFreshCalls} calls, ${totals.lunaFreshInputTokens} input / ${totals.lunaFreshOutputTokens} output tokens`,
	);
}

/**
 * One row per run with a manifest (noise reruns left out). The delta against
 * the parent comes from the latest recorded compare, else from the committed
 * outcomes of both primaries.
 */
async function iterationRows(
	entries: Awaited<ReturnType<typeof readLedger>>,
): Promise<IterationRow[]> {
	const compares = entries.filter(
		(entry): entry is CompareEntry => entry.command === "compare",
	);
	const rows: IterationRow[] = [];
	for (const manifest of await readManifests(evidenceRoot)) {
		if (manifest.kind !== "run") continue;
		const summary = await readSummary<RunSummary>(
			summaryPath(evidenceRoot, manifest.runId),
		);
		const primary = summary?.policies.find(
			(policy) => policy.policy === summary.primary,
		);
		const recorded = compares.findLast(
			(entry) =>
				entry.left.runId === manifest.parent &&
				entry.right.runId === manifest.runId,
		);
		let delta: IterationRow["delta"] = recorded ?? null;
		if (!delta && manifest.parent) {
			try {
				const sides = {
					labRoot,
					evidenceRoot,
				};
				const left = await loadSide({
					...sides,
					runId: manifest.parent,
				});
				const right = await loadSide({
					...sides,
					runId: manifest.runId,
				});
				delta = (await deltaBetween(evidenceRoot, left, right)).all;
			} catch {
				delta = null;
			}
		}
		rows.push({
			runId: manifest.runId,
			parent: manifest.parent,
			hypothesis: manifest.hypothesis,
			membership: primary?.rates.membership ?? null,
			membershipFlips: primary?.membershipFlips ?? null,
			membershipFlipBase: primary?.membershipFlipBase ?? null,
			tolerantUnitAccuracy: primary?.rates.tolerantUnitAccuracy ?? null,
			unitAccuracy: primary?.rates.unitAccuracy ?? null,
			jevInputTokensPerSentence:
				summary?.cost.jevInputTokensPerSentence ?? null,
			delta,
			verdict: recorded?.verdict ?? null,
		});
	}
	return rows;
}

/**
 * One row per run with a manifest on the membership focus set's source set
 * (#761). The delta against the parent comes from the latest recorded
 * compare that carries one, else from the committed outcomes of both.
 */
async function focusIterationRows(
	entries: Awaited<ReturnType<typeof readLedger>>,
): Promise<FocusIterationRow[]> {
	const compares = entries.filter(
		(entry): entry is CompareEntry => entry.command === "compare",
	);
	const rows: FocusIterationRow[] = [];
	for (const manifest of await readManifests(evidenceRoot)) {
		if (manifest.kind !== "run") continue;
		const focus = focusOf(manifest.set);
		const outcomes =
			focus && (await readOutcomes(evidenceRoot, manifest.runId));
		if (!focus || !outcomes) continue;
		const recorded = compares.findLast(
			(entry) =>
				entry.left.runId === manifest.parent &&
				entry.right.runId === manifest.runId &&
				entry.focus !== undefined,
		);
		let delta = recorded?.focus ?? null;
		if (!delta && manifest.parent) {
			try {
				const sides = { labRoot, evidenceRoot };
				delta =
					focusBetween(
						await loadSide({ ...sides, runId: manifest.parent }),
						await loadSide({ ...sides, runId: manifest.runId }),
					)?.delta ?? null;
			} catch {
				delta = null;
			}
		}
		rows.push({
			runId: manifest.runId,
			parent: manifest.parent,
			score: scoreFocus(outcomes, manifest.primary, focus),
			delta,
		});
	}
	return rows;
}

async function limitQuestionsPerCall() {
	const set = await loadSet(labRoot, "dev");
	const pieces = (labCase: LabCase) =>
		labCase.input.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		).length;
	const cases = [...set.cases]
		.sort((a, b) => pieces(b) - pieces(a))
		.slice(0, Number(values.limit ?? 12));
	const tokenBudget = Number(values["token-budget"] ?? defaultTokenBudget);
	if (
		ledgerTotals(await readLedger(ledgerPath)).jevFreshInputTokens >=
		tokenBudget
	)
		throw Error("jev token budget line reached");
	const provenance = await provenanceOf({ packageRoot, repository, cli });
	const calls: CallRecord[] = [];
	let fresh = 0;
	const jev = new Jev({
		cacheDirectory: join(labRoot, "cache"),
		concurrency: Number(values.concurrency),
		...(values.model ? { model: values.model } : {}),
		allowFloatingModel: values["allow-floating-model"],
		onSpend: (tokens) => {
			fresh += tokens;
		},
	});
	const results = await questionsPerCall({
		cases,
		jev,
		sizes: (values.sizes ?? "").split(",").map(Number),
		baselineRepetitions: 3,
	});
	console.log(
		`${cases.length} sentences, ${cases.map(pieces).join("/")} pieces`,
	);
	console.log(
		"q/call rep  calls failed  tokens    meanMs  maxMs   |Δp| vs base  flips/compared  errors",
	);
	for (const result of results) {
		console.log(
			`${String(result.questionsPerCall).padStart(6)} ${result.repetition}  ${String(result.calls).padStart(5)} ${String(result.failedCalls).padStart(6)} ${String(result.inputTokens).padStart(8)} ${result.meanCallLatencyMs.toFixed(0).padStart(7)} ${result.maxCallLatencyMs.toFixed(0).padStart(6)}   ${result.meanAbsoluteDifference.toFixed(4)}        ${result.decisionFlips}/${result.compared}  ${result.errors.join(" | ").slice(0, 300)}`,
		);
		calls.push({
			executor: "jev",
			stage: "limit",
			questions: result.questions,
			inputTokens: result.inputTokens,
			outputTokens: 0,
			latencyMs: 0,
			cached: true,
		});
	}
	const runId = `${new Date().toISOString().replace(/[-:]/gu, "").slice(0, 15)}--limit-qpc`;
	await mkdir(join(evidenceRoot, "summaries"), { recursive: true });
	await writeFile(
		join(evidenceRoot, "summaries", `${runId}.json`),
		`${JSON.stringify({ runId, set: set.name, setHash: set.hash, cases: cases.map(({ id }) => id), results }, null, 1)}\n`,
	);
	const spend = spendOf(calls);
	await appendLedger(ledgerPath, {
		runId,
		at: new Date().toISOString(),
		command: "limit-qpc",
		set: set.name,
		setHash: set.hash,
		cases: cases.length,
		gitHead: provenance.gitHead,
		dirty: provenance.dirty,
		codeHash: provenance.codeHash,
		model: [...jev.resolvedModels].join(",") || jev.model,
		...spend,
		jev: { ...spend.jev, freshCalls: 0, freshInputTokens: fresh },
	});
}

const command = positionals[0];
if (command === "freeze") await freeze();
else if (command === "run") await run();
else if (command === "report") await report(values.run ?? "");
else if (command === "compare") await compare();
else if (command === "noise") await noise();
else if (command === "sweep") await sweep();
else if (command === "ledger") await ledger();
else if (command === "limit-qpc") await limitQuestionsPerCall();
else
	throw Error("Commands: freeze, run, report, compare, noise, sweep, ledger");
