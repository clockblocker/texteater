/**
 * The German `segment.inUnits` lab: freezes the case sets, runs an arm with
 * repetitions, reports and compares runs, measures the noise floor and keeps
 * the ledger and the iteration table.
 *
 *   bun run segment-in-units-lab freeze [--force]
 *   bun run segment-in-units-lab run --arm pairwise --subset smoke --reps 1 [--opt render=tagged]
 *       [--parent <runId>] [--hypothesis "<one line>"] [--allow-dirty] [--model jev-1.13.0]
 *   bun run segment-in-units-lab replay --run <runId>
 *   bun run segment-in-units-lab report --run <runId> [--subset slice300]
 *   bun run segment-in-units-lab compare --left <runId>[:policy] --right <runId>[:policy]
 *       [--noise <noiseRunId>] [--record [--verdict "<text>"]]
 *   bun run segment-in-units-lab noise --run <runId> [--reps 3] [--offset 1000]
 *   bun run segment-in-units-lab sweep --run <runId> [--policy <baseline>] [--replay <runId>[:policy]]
 *   bun run segment-in-units-lab ledger [--table]
 *   bun run segment-in-units-lab round [--repin --reason "<why>"]
 *   bun run segment-in-units-lab round --open <id> --cap <tokens> --stop-line <tokens> [--note "<text>"]
 *
 * `run`, `noise` and `limit-qpc` count against the current round
 * (`lab/segmentation/harness/round.ts`): `--estimate` prices a run offline and stops, a live run
 * refuses to start when its projected spend would cross the round's stop
 * line or when dumcorpus's prompt inputs moved since the round was pinned
 * (`--repin` accepts today's dumcorpus), and every run stops at the line.
 *
 * Raw runs, their outcomes and the answer cache live under
 * `.runs/segment-in-units-lab/` (gitignored). The frozen sets, each run's
 * manifest and summary, and the ledger live under
 * `evidence/segment-in-units-lab/`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import { compareRuns, loadRun } from "promptsmith/storage";
import { z } from "zod";
import { arms } from "../lab/segmentation/de/arms/index.js";
import {
	deltaBetween,
	focusBetween,
	loadSide,
	type Side,
} from "../lab/segmentation/harness/compare.js";
import {
	currentSetHash,
	focusOf,
	freezeSets,
	type LabCase,
	loadSet,
	type SetName,
	setNameOf,
	subset,
	trackedSetsRoot,
} from "../lab/segmentation/harness/corpus.js";
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
} from "../lab/segmentation/harness/evidence.js";
import { exportPolicy } from "../lab/segmentation/harness/export.js";
import {
	type Change,
	type FocusComparison,
	type FocusScore,
	focusGroupLabel,
	focusGroups,
	rateOf,
	scoreFocus,
	type UnitTally,
} from "../lab/segmentation/harness/focus.js";
import {
	type CallRecord,
	JevCache,
	type JevCacheOptions,
	transportText,
} from "../lab/segmentation/harness/jev-cache.js";
import {
	appendLedger,
	type CompareEntry,
	ledgerTotals,
	readLedger,
	spendOf,
} from "../lab/segmentation/harness/ledger.js";
import { questionsPerCall } from "../lab/segmentation/harness/limits.js";
import {
	breakdown,
	byGoldRoute,
	byPhenomenon,
	byRule,
	byShape,
	calibration,
	confusions,
	type GroupingExample,
	groupingExamples,
	type PolicySummary,
	policiesOf,
	primaryOf,
	summarizeCost,
	summarizePolicy,
} from "../lab/segmentation/harness/metrics.js";
import { noiseFloor } from "../lab/segmentation/harness/noise.js";
import {
	accuracyOf,
	membershipFlipsOf,
	type OutcomeRow,
	outcomePolicies,
	outcomesOf,
	pickScore,
	variantsOf,
} from "../lab/segmentation/harness/outcomes.js";
import {
	dumcorpusHashOf,
	provenanceOf,
	type RunManifest,
} from "../lab/segmentation/harness/provenance.js";
import {
	currentPin,
	enterRound,
	guardProjectedSpend,
	pinDrift,
	pinText,
	priceProjection,
	projectedSpend,
	projectionText,
	type Round,
	readRounds,
	repinned,
	roundOf,
	roundSpend,
	roundStatus,
	roundsPath,
	standInAnswers,
	stopLineOf,
	writeRounds,
} from "../lab/segmentation/harness/round.js";
import {
	conformTo734,
	rerouted,
} from "../lab/segmentation/harness/ruling734.js";
import {
	type LabRun,
	loadLabRun,
	runArm,
	saveLabRun,
} from "../lab/segmentation/harness/run.js";
import { sweepRows, sweepTable } from "../lab/segmentation/harness/sweep.js";
import {
	type FocusIterationRow,
	focusIterationTable,
	formatP,
	type IterationRow,
	iterationTable,
} from "../lab/segmentation/harness/table.js";
import { createTypeSafeAsk } from "../src/segment/typesafe-ask.js";

const packageRoot = resolve(import.meta.dir, "..");
const repository = resolve(packageRoot, "../..");
const cli = "cli/segment-in-units-lab.ts";
const labRoot = join(packageRoot, ".runs", "segment-in-units-lab");
const setsRoot = trackedSetsRoot;
const evidenceRoot = join(packageRoot, "evidence", "segment-in-units-lab");
const ledgerPath = join(evidenceRoot, "ledger.jsonl");
const roundBook = roundsPath(evidenceRoot);
const roots = { labRoot, evidenceRoot };

/**
 * The lab's cached jev under `.runs/`. Unless it is offline or projecting,
 * it asks production's TypeSafe ask on a miss, retrying as the cache does,
 * and needs `TYPESAFE_API_KEY`.
 */
function jevCache(options: Omit<JevCacheOptions, "cacheDirectory">) {
	const live = !options.offline && !options.project;
	const apiKey = process.env.TYPESAFE_API_KEY;
	if (live && !apiKey)
		throw Error("TYPESAFE_API_KEY is not set; a live command asks jev");
	return new JevCache({
		cacheDirectory: join(labRoot, "cache"),
		...(live && apiKey ? { transport: createTypeSafeAsk({ apiKey }) } : {}),
		...options,
	});
}

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
		estimate: { type: "boolean", default: false },
		repin: { type: "boolean", default: false },
		reason: { type: "string" },
		open: { type: "string" },
		cap: { type: "string" },
		"stop-line": { type: "string" },
		note: { type: "string" },
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

/** B-cubed precision/recall/F1, as `report` and `compare` print it. */
const hoverText = (precision: number, recall: number, f1: number) =>
	`${percent(precision)}/${percent(recall)}/${percent(f1)}`;

/**
 * One policy's grouping (#701): hover B-cubed on every record, on Full
 * records and over multi-piece gold units, each with [records, Segments],
 * and the highlighted Segments no gold unit asserts; pair precision on Full
 * records, on the pairs any record decides, pair recall and F1, each with
 * [records, pairs]; the over- and under-merges per repetition; membership
 * of discontinuous, multi-piece and one-piece gold units.
 */
function groupingText(summary: PolicySummary): string {
	const { rates, tally, hoverRecords, pairRecords } = summary;
	return [
		`hover ${hoverText(rates.hoverPrecision, rates.hoverRecall, rates.hoverF1)} [${hoverRecords.all}, ${tally.hoverSegments}]`,
		`Full ${hoverText(rates.fullHoverPrecision, rates.fullHoverRecall, rates.fullHoverF1)} [${hoverRecords.full}, ${tally.fullHoverSegments}]`,
		`multi ${hoverText(rates.multiHoverPrecision, rates.multiHoverRecall, rates.multiHoverF1)} [${hoverRecords.multi}, ${tally.multiHoverSegments}]`,
		`unasserted ${tally.hoverUnasserted}/${tally.hoverHighlighted}`,
		`pairP ${percent(rates.pairPrecision)} [${pairRecords.fullPrecision} Full, ${tally.fullPairs}]`,
		`assertedP ${percent(rates.assertedPairPrecision)} [${pairRecords.assertedPrecision}, ${tally.decidedPairs}]`,
		`pairR ${percent(rates.pairRecall)} [${pairRecords.recall}, ${tally.goldPairs}]`,
		`F1 ${percent(rates.pairF1)} asserted ${percent(rates.assertedPairF1)}`,
		`over ${tally.overMerged} (${summary.overMergedByRepetition.join("/")})`,
		`under ${tally.underMerged} (${summary.underMergedByRepetition.join("/")})`,
		`mem% discontinuous ${percent(rates.discontinuousMembership)} [${tally.discontinuousScored}] multi ${percent(rates.multiMembership)} one ${percent(rates.singleMembership)}`,
	].join("  ");
}

const groupingLegend =
	"grouping (#701), summed over repetitions: hover = B-cubed P/R/F1 of what hovering each Segment of a scored gold unit highlights, every record; Full = Full records only; multi = Segments of multi-piece gold units only; [records, Segments]; unasserted = highlighted Segments no gold unit asserts, of all highlighted, counted against P; pairP = Segment pairs a returned unit joins that one gold unit holds, Full records only; assertedP = the same over pairs touching an asserted unit on any record; pairR = gold pairs kept together; [records, pairs]; over = returned units joining Segments of 2+ gold units, under = gold units split, per repetition in brackets";

/**
 * One merge on one line, the way `report` prints it and `summary.json`
 * keeps it: an over-merge as its parts with their gold routes (? where no
 * gold unit is asserted), an under-merge as its gold unit and fragments,
 * then the repetitions, the case and the Sentence.
 */
const exampleLine = (example: GroupingExample) =>
	`${
		example.kind === "over"
			? example.parts
					.map((part) => `[${part.text} ${part.gold ?? "?"}]`)
					.join(" + ")
			: `${example.text} ${example.gold ?? ""} → ${example.parts.map((part) => `[${part.text}]`).join(" ")}`
	} (${example.repetitions.join(",")}) ${example.case} «${example.sentence}»`;

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
		if (currentSetHash(setsRoot, name) !== undefined && !values.force)
			throw Error(`${name} is frozen already; pass --force to refreeze`);
	for (const set of await freezeSets(setsRoot, repository))
		console.log(
			`${set.name}: ${set.cases.length} cases (${set.cases.filter((labCase) => labCase.facts.coverage === "Full").length} Full), ${set.cases.reduce((total, labCase) => total + labCase.idealOutput.units.length, 0)} gold units, hash ${set.hash}, git ${set.gitHead.slice(0, 8)}, ${set.dirtyRecordFiles} uncommitted record files, withheld ${set.withheld?.join(", ") || "none"}`,
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
 * The round a command counts against and the dumcorpus state it reads. A
 * live command refuses drifted prompt inputs unless `--repin`; an offline
 * one reports them.
 */
async function account(live: boolean, command: string) {
	const entered = await enterRound({
		evidenceRoot,
		repository,
		live,
		repin: values.repin,
		reason: values.reason ?? `${command} --repin`,
	});
	if (entered.warning) console.warn(`\n*** ${entered.warning}\n`);
	const stopLine = stopLineOf(entered.round, values["token-budget"]);
	const spent = roundSpend(
		await readLedger(ledgerPath),
		entered.round.id,
	).jevFreshInputTokens;
	return { ...entered, stopLine, spent };
}

/** What `--estimate` prints: the projection against what the round has left. */
function printEstimate(
	round: Round,
	spent: number,
	stopLine: number,
	projected: number,
) {
	console.log(
		`round ${round.id}: spent ${spent}, this run ${projected}, stop line ${stopLine}: ${spent + projected <= stopLine ? "fits" : "CROSSES THE STOP LINE"}; nothing was asked`,
	);
}

/**
 * Runs an arm and writes everything a run leaves: the raw run, the
 * manifest, the outcomes, the ledger line and the summary. A live run first
 * prices itself offline and refuses to cross the round's stop line;
 * `--estimate` stops after the price.
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
	const set = await loadSet(setsRoot, args.setName);
	let cases = subset(set, args.subsetName);
	if (args.limit !== null) cases = cases.slice(0, args.limit);
	const live = !values.offline;
	const {
		round,
		pin,
		stopLine,
		spent: spentBefore,
	} = await account(live && !values.estimate, args.kind);
	if (live || values.estimate) {
		const projecting = jevCache({
			...(values.qpc ? { questionsPerRequest: Number(values.qpc) } : {}),
			...(args.model ? { model: args.model } : {}),
			allowFloatingModel: values["allow-floating-model"],
			offline: true,
			project: standInAnswers,
		});
		await runArm({
			runId: "projection",
			arm,
			options: args.options,
			set,
			subset: args.subsetName,
			cases,
			repetitions: args.repetitions,
			repetitionOffset: args.repetitionOffset,
			jev: projecting,
			concurrency: Number(values.concurrency),
			gitHead: args.provenance.gitHead,
		});
		const priced = priceProjection(projecting.projection);
		console.log(projectionText(priced));
		if (values.estimate) {
			printEstimate(round, spentBefore, stopLine, projectedSpend(priced));
			return undefined;
		}
		guardProjectedSpend({ round, spent: spentBefore, stopLine, priced });
	}
	let spentNow = 0;
	const beforeSpend = () => {
		if (spentBefore + spentNow >= stopLine)
			throw Error(
				`Round ${round.id} reached its stop line: ${spentBefore + spentNow} of ${stopLine} fresh jev input tokens`,
			);
	};
	const jev = jevCache({
		...(values.qpc ? { questionsPerRequest: Number(values.qpc) } : {}),
		...(args.model ? { model: args.model } : {}),
		allowFloatingModel: values["allow-floating-model"],
		offline: values.offline,
		beforeSpend,
		onSpend: (tokens) => {
			spentNow += tokens;
		},
	});
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
		`${runId}: ${cases.length} cases × ${args.repetitions} (repetitions from ${args.repetitionOffset}), model ${jev.model}, round ${round.id} so far ${spentBefore} of ${stopLine} fresh jev input tokens, ${pinText(pin)}`,
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
	const promptHashes = Object.fromEntries(
		Object.entries(jev.promptHashes()).map(([stage, hash]) => [
			`jev/${stage}`,
			hash,
		]),
	);
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
		round: round.id,
		pin,
		transport: jev.transport,
	};
	await writeManifest(evidenceRoot, manifest, patch);
	const outcomes = outcomesOf(labRun, plainCases(set.cases));
	await writeOutcomes(labRoot, runId, outcomes);
	const calls = labRun.cases.flatMap((caseRun) =>
		caseRun.repetitions.flatMap((repetition) => repetition.calls),
	);
	const spend = spendOf(calls);
	await appendLedger(ledgerPath, {
		runId,
		at: new Date().toISOString(),
		command: args.kind,
		round: round.id,
		pin: pin.hash,
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
		transport: manifest.transport,
	});
	console.log(
		`jev fresh ${spend.jev.freshInputTokens} input tokens, luna fresh ${spend.luna.freshInputTokens}/${spend.luna.freshOutputTokens} tokens; ${transportText(jev.transport)}`,
	);
	await report(runId);
	return { manifest, outcomes };
}

async function run() {
	const provenance = await provenanceOf({ packageRoot, repository, cli });
	if (!values.estimate) guardDirty(provenance);
	if (values.parent && !(await readManifest(evidenceRoot, values.parent)))
		console.warn(
			`--parent ${values.parent} has no committed manifest; the table cannot compare against it`,
		);
	await execute({
		kind: "run",
		armId: values.arm ?? "",
		options: optionsOf(values.opt ?? []),
		setName: setNameOf(values.set),
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
 * Replays a raw run offline with today's code and compares every policy's
 * output, per case and repetition, with what the run stored. A cache miss
 * fails its case. Nothing is asked, written or ledgered; the exit code is 1
 * when an output differs or a case the run completed fails.
 */
async function replayRun() {
	const runId = values.run ?? "";
	const original = await loadLabRun(labRoot, runId);
	const arm = arms[original.arm];
	if (!arm)
		throw Error(
			`${runId} ran ${original.arm}, which is retired; replay it at ec467e8d`,
		);
	const set = await loadSet(
		setsRoot,
		setNameOf(original.set),
		original.setHash,
	);
	const byId = new Map(set.cases.map((labCase) => [labCase.id, labCase]));
	// Offline: a pin drift is reported, never refused.
	const { pin } = await account(false, "replay");
	const recordedPin = (await readManifest(evidenceRoot, runId))?.pin;
	const drift = recordedPin ? pinDrift(recordedPin, pin) : [];
	if (recordedPin && drift.length > 0)
		console.warn(
			`\n*** ${runId} read dumcorpus at ${pinText(recordedPin)}; today's ${pinText(pin)} differs in ${drift.join(", ")}, so requests built from them miss the cache\n`,
		);
	const jev = jevCache({
		model: original.model,
		allowFloatingModel: values["allow-floating-model"],
		offline: true,
	});
	let compared = 0;
	let identical = 0;
	let fresh = 0;
	const differing: string[] = [];
	const failed: string[] = [];
	const failedBefore: string[] = [];
	await Effect.runPromise(
		Effect.forEach(
			original.cases,
			(caseRun) =>
				Effect.promise(async () => {
					const labCase = byId.get(caseRun.id);
					if (!labCase)
						throw Error(`${set.name} has no case ${caseRun.id}`);
					for (const [
						repetition,
						recorded,
					] of caseRun.repetitions.entries()) {
						const at = `${caseRun.id}#${repetition}`;
						const calls: CallRecord[] = [];
						try {
							const result = await arm.run(labCase.input, {
								jev,
								repetition:
									repetition +
									(original.repetitionOffset ?? 0),
								calls,
								options: original.options,
							});
							fresh += calls.filter(
								(call) => !call.cached,
							).length;
							if (recorded.error) {
								differing.push(
									`${at}: the run failed, the replay succeeds`,
								);
								continue;
							}
							const stored = recorded.outputs ?? {};
							const policies = new Set([
								...Object.keys(stored),
								...Object.keys(result.outputs),
							]);
							for (const policy of policies) {
								compared++;
								if (
									canonicalJson(
										result.outputs[policy] ?? null,
									) === canonicalJson(stored[policy] ?? null)
								)
									identical++;
								else differing.push(`${at} ${policy}`);
							}
							if (result.primary !== recorded.primary)
								differing.push(
									`${at}: primary ${result.primary}, was ${recorded.primary}`,
								);
						} catch (error) {
							const message =
								error instanceof Error
									? error.message
									: String(error);
							(recorded.error ? failedBefore : failed).push(
								`${at}: ${message}`,
							);
						}
					}
				}),
			{ concurrency: Number(values.concurrency), discard: true },
		),
	);
	console.log(
		`replay ${runId} (${original.arm} ${canonicalJson(original.options)}, ${original.cases.length} cases × ${original.repetitions}, set ${set.name}@${set.hash}): ${identical}/${compared} policy outputs identical, ${differing.length} differ, ${failed.length} case repetitions fail, ${failedBefore.length} failed in the run too, ${fresh} fresh calls`,
	);
	for (const line of [...differing, ...failed].slice(0, 40))
		console.log(`  ${line}`);
	if (differing.length > 0 || failed.length > 0) process.exitCode = 1;
}

/**
 * Reruns a baseline's exact configuration at fresh repetition indices and
 * records the per-bucket flip rate against it for every policy.
 */
async function noise() {
	const baselineId = values.run ?? "";
	const baseline = await readManifest(evidenceRoot, baselineId);
	const baselineRows = await readOutcomes(labRoot, baselineId);
	if (!baseline || !baselineRows)
		throw Error(
			`--run ${baselineId} needs a committed manifest and its outcomes in .runs/; runs made before manifests cannot be rerun exactly`,
		);
	const provenance = await provenanceOf({ packageRoot, repository, cli });
	if (!values.estimate) guardDirty(provenance);
	const drift = [
		provenance.codeHash !== baseline.codeHash ? "code" : "",
		provenance.dumcorpusHash !== dumcorpusHashOf(baseline)
			? "dumcorpus"
			: "",
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
	const executed = await execute({
		kind: "noise",
		armId: baseline.arm,
		options: baseline.options,
		setName: setNameOf(baseline.set.name),
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
	if (!executed) return;
	const { manifest, outcomes } = executed;
	const promptsMatch =
		canonicalJson(manifest.promptHashes) ===
		canonicalJson(baseline.promptHashes);
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

/** What the iteration table reads of a run's summary (`report` writes it). */
const iterationSummarySchema = z.object({
	primary: z.string(),
	policies: z.array(
		z.object({
			policy: z.string(),
			rates: z.object({
				membership: z.number(),
				tolerantUnitAccuracy: z.number(),
				unitAccuracy: z.number(),
			}),
			membershipFlips: z.number(),
			membershipFlipBase: z.number(),
		}),
	),
	cost: z.object({ jevInputTokensPerSentence: z.number() }),
});

async function report(runId: string) {
	const labRun = await loadLabRun(labRoot, runId);
	const set = await loadSet(setsRoot, setNameOf(labRun.set), labRun.setHash);
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
		`${"policy".padEnd(30)}   mem% ${"hover P/R/F1".padStart(14)} multiMem% singleMem%  memFlips   tol% route|mem tol%  strict% route|mem%   var%     k   case%     full% caseFlips varying  M/A/R/S/Mi/Stub  split/merged/crossed  mem% by rep`,
	);
	for (const row of rows) {
		const { rates, tally } = row;
		console.log(
			[
				row.policy.padEnd(30),
				percent(rates.membership).padStart(6),
				hoverText(
					rates.hoverPrecision,
					rates.hoverRecall,
					rates.hoverF1,
				).padStart(14),
				percent(rates.multiMembership).padStart(9),
				percent(rates.singleMembership).padStart(10),
				`${row.membershipFlips}/${row.membershipFlipBase}`.padStart(9),
				percent(rates.tolerantUnitAccuracy).padStart(6),
				percent(rates.tolerantRouteGivenMembership).padStart(13),
				percent(rates.unitAccuracy).padStart(8),
				percent(rates.routeGivenMembership).padStart(10),
				percent(rates.variantRate).padStart(6),
				(Number.isNaN(rates.meanVariants)
					? "–"
					: rates.meanVariants.toFixed(2)
				).padStart(5),
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
		"mem%: gold Segment set exact, any route; hover P/R/F1: B-cubed of what hovering each Segment of a scored gold unit highlights (grouping below); memFlips: units whose membership differs between repetitions; tol%: membership with an acceptable route, the same, a tolerated confusion or the gold among the variants (ADR 0008); strict%: same route too, a borderline unit's first; var%: units with membership that carry route variants, k their mean count; case%: contract (membership) passes",
	);
	console.log(groupingLegend);
	for (const row of rows)
		console.log(`  ${row.policy.padEnd(30)} ${groupingText(row)}`);
	const examples = groupingExamples(labRun, cases, primary, only);
	const merges = {
		over: examples
			.filter((example) => example.kind === "over")
			.map(exampleLine),
		under: examples
			.filter((example) => example.kind === "under")
			.map(exampleLine),
	};
	for (const kind of ["over", "under"] as const) {
		const lines = merges[kind];
		const shown = Math.min(lines.length, Number(values.limit ?? 12));
		console.log(
			`${kind}-merges (${primary}): ${lines.length} distinct, first ${shown}; repetitions in brackets`,
		);
		for (const line of lines.slice(0, shown)) console.log(`  ${line}`);
	}
	const outcomeRows = outcomesOf(labRun, cases);
	// The click-time pick (#760), on the units that carried variants.
	const pickCalls = labRun.cases
		.filter((caseRun) => !only || only.has(caseRun.id))
		.flatMap((caseRun) => caseRun.repetitions)
		.map((repetition) =>
			repetition.calls
				.filter((call) => call.stage === "pick")
				.reduce((total, call) => total + call.inputTokens, 0),
		);
	const picks = policies
		.filter(
			(policy) =>
				policy.endsWith("+pick") &&
				policies.includes(policy.slice(0, -"+pick".length)),
		)
		.map((policy) => {
			const scope = only
				? outcomeRows.filter((row) => only.has(row.case))
				: outcomeRows;
			const score = pickScore(
				scope,
				policy.slice(0, -"+pick".length),
				policy,
			);
			console.log(
				`pick (${policy}): ${score.units} unit-repetitions carried variants; gold among them ${percent(score.among / score.units)}%, picked exactly ${percent(score.strict / score.units)}%, picked acceptably ${percent(score.tolerant / score.units)}%; pick input ${(pickCalls.reduce((total, tokens) => total + tokens, 0) / Math.max(1, pickCalls.length)).toFixed(0)} jev tokens/sentence`,
			);
			return { policy, ...score };
		});
	const focus = focusOf({ name: labRun.set, hash: labRun.setHash });
	const focusScore = focus
		? scoreFocus(outcomeRows, primary, focus, only)
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
		...(picks.length > 0 ? { picks } : {}),
		...(focusScore ? { focus: focusScore } : {}),
		cost,
		routeErrors: {
			policy: primary,
			total: routeErrors,
			tolerated,
			byPair: Object.fromEntries(byPair),
			confusions: Object.fromEntries(confused),
		},
		grouping: { policy: primary, ...merges },
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
	const setCases = async (setName: string, setHash: string) =>
		casesOf((await loadSet(setsRoot, setNameOf(setName), setHash)).cases);
	const side = (runId: string, policy: string | undefined) =>
		loadSide({
			...roots,
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
				`${entry.runId}: raw run missing; comparing its stored outcomes`,
			);
	const only = values.subset
		? new Set(
				subset(
					await loadSet(
						setsRoot,
						setNameOf(left.setName),
						left.setHash,
					),
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
		roots,
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
		const delta = await deltaBetween(roots, left, right, {
			...deltaOptions,
			measure,
		});
		console.log(
			`${measure === "tolerant" ? "tolerant route (ADR 0008)" : "strict (route equal)"}: left ${percent(accuracyOf(scopedRows(left.rows), left.policy, measure))}%, right ${percent(accuracyOf(scopedRows(right.rows), right.policy, measure))}%; +${delta.all.gained} −${delta.all.lost}, p ${formatP(delta.all.p)}${floorText(delta.all.floor, delta.all.beyondNoise)}`,
		);
	}
	const variantText = (entry: Side) => {
		const tally = variantsOf(scopedRows(entry.rows), entry.policy);
		return `${percent(tally.withVariants / tally.units)}%${tally.withVariants > 0 ? ` (mean ${(tally.routes / tally.withVariants).toFixed(2)} routes)` : ""}`;
	};
	console.log(
		`route variants, of unit-repetitions with membership (ADR 0008): left ${variantText(left)}, right ${variantText(right)}`,
	);
	if (left.raw && right.raw)
		await compareGrouping(
			{ raw: left.raw, policy: left.policy },
			{ raw: right.raw, policy: right.policy },
			setCases,
			only,
		);
	else
		console.log(
			"grouping (#701): needs both raw runs; the stored outcomes hold no returned units",
		);
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
			round: roundOf(await readRounds(roundBook)).id,
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

/**
 * Each side's grouping (#701) and its membership by construction: the
 * phenomenon tags of multi-piece gold units, summed over repetitions.
 */
async function compareGrouping(
	left: { readonly raw: LabRun; readonly policy: string },
	right: { readonly raw: LabRun; readonly policy: string },
	casesOfSet: (
		setName: string,
		setHash: string,
	) => Promise<ReadonlyMap<string, LabCase>>,
	only: ReadonlySet<string> | undefined,
) {
	console.log(groupingLegend);
	const sides = [
		["left", left],
		["right", right],
	] as const;
	const constructions = [];
	for (const [name, side] of sides) {
		const cases = await casesOfSet(side.raw.set, side.raw.setHash);
		console.log(
			`  ${name.padEnd(5)} ${groupingText(summarizePolicy(side.raw, cases, side.policy, only))}`,
		);
		constructions.push(
			breakdown(side.raw, cases, side.policy, byPhenomenon, only),
		);
	}
	const [before = {}, after = {}] = constructions;
	console.log(
		"membership by construction, phenomenon tags past one piece (summed over repetitions): key scored left% → right%",
	);
	for (const [key, entry] of Object.entries(before)
		.filter(([key]) => !key.startsWith("one piece"))
		.sort((a, b) => b[1].scored - a[1].scored)) {
		const other = after[key];
		console.log(
			`  ${key.padEnd(40)} ${String(entry.scored).padStart(5)} ${percent(entry.membership / entry.scored).padStart(6)} → ${other ? percent(other.membership / other.scored) : "–"}`,
		);
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
		const set = await loadSet(
			setsRoot,
			setNameOf(entry.raw.set),
			entry.raw.setHash,
		);
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
		(await loadSet(setsRoot, setNameOf(left.setName), left.setHash)).cases,
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
	const set = await loadSet(setsRoot, setNameOf(labRun.set), labRun.setHash);
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
					canonicalJson(output) ===
						canonicalJson(other?.outputs?.[policy] ?? null)
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
	const round = roundOf(await readRounds(roundBook));
	const status = roundStatus(round, entries);
	console.log(
		`${entries.length} entries; jev fresh input ${totals.jevFreshInputTokens} tokens over every round; luna fresh ${totals.lunaFreshCalls} calls, ${totals.lunaFreshInputTokens} input / ${totals.lunaFreshOutputTokens} output tokens`,
	);
	console.log(
		`round ${round.id}: ${status.jevFreshInputTokens} fresh jev input tokens in ${status.lines} lines, ${status.leftToStopLine} left to the stop line at ${status.stopLineTokens}`,
	);
}

/**
 * The current round: what it has spent and has left, and its pin against
 * today's dumcorpus. `--repin` pins it at today's dumcorpus, `--open` opens a
 * new current round pinned at it.
 */
async function roundCommand() {
	const book = await readRounds(roundBook);
	const pin = await currentPin(repository);
	if (values.open) {
		const capTokens = Number(values.cap);
		const stopLine = Number(values["stop-line"]);
		if (!(capTokens > 0) || !(stopLine > 0))
			throw Error(
				"--open needs --cap and --stop-line in fresh jev input tokens",
			);
		if (book.rounds.some((round) => round.id === values.open))
			throw Error(`Round ${values.open} exists already`);
		if (stopLine > capTokens)
			throw Error(
				`--stop-line ${stopLine} is past the cap of ${capTokens} tokens`,
			);
		await writeRounds(roundBook, {
			current: values.open,
			rounds: [
				...book.rounds,
				{
					id: values.open,
					opened: new Date().toISOString().slice(0, 10),
					note: values.note ?? "",
					capTokens,
					stopLineTokens: stopLine,
					pin,
					repins: [],
				},
			],
		});
		console.log(`opened round ${values.open}, pinned at ${pinText(pin)}`);
		return;
	}
	let round = roundOf(book);
	const drift = pinDrift(round.pin, pin);
	if (values.repin && drift.length > 0) {
		const next = repinned(
			book,
			round.id,
			pin,
			values.reason ?? "round --repin",
		);
		await writeRounds(roundBook, next);
		round = roundOf(next);
		console.log(`re-pinned round ${round.id} at ${pinText(pin)}`);
	}
	const status = roundStatus(
		round,
		await readLedger(ledgerPath),
		stopLineOf(round, values["token-budget"]),
	);
	console.log(
		[
			`round ${round.id} (opened ${round.opened}), in fresh jev input tokens`,
			`  spent     ${status.jevFreshInputTokens} in ${status.lines} ledger lines, ${status.jevFreshCalls} fresh calls${status.lunaFreshCalls > 0 ? `, ${status.lunaFreshCalls} fresh Luna calls` : ""}`,
			`  stop line ${status.stopLineTokens}: ${status.leftToStopLine} left`,
			`  cap       ${status.capTokens}: ${status.leftToCap} left, of which ${status.reservedForFinal} are kept for the final held-out run`,
			`  pinned    ${pinText(round.pin)} at ${round.pin.at}${round.repins.length > 0 ? `, re-pinned ${round.repins.length}×` : ""}`,
			`  today     ${pinText(pin)}: ${pinDrift(round.pin, pin).length === 0 ? "matches the pin" : `differs in ${pinDrift(round.pin, pin).join(", ")}; live runs refuse without --repin`}`,
		].join("\n"),
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
		const summary = await readSummary(
			iterationSummarySchema,
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
				const left = await loadSide({
					...roots,
					runId: manifest.parent,
				});
				const right = await loadSide({
					...roots,
					runId: manifest.runId,
				});
				delta = (await deltaBetween(roots, left, right)).all;
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
 * compare that carries one, else from the stored outcomes of both.
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
		const outcomes = focus && (await readOutcomes(labRoot, manifest.runId));
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
				delta =
					focusBetween(
						await loadSide({ ...roots, runId: manifest.parent }),
						await loadSide({ ...roots, runId: manifest.runId }),
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
	const set = await loadSet(setsRoot, "dev");
	const pieces = (labCase: LabCase) =>
		labCase.input.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		).length;
	const cases = [...set.cases]
		.sort((a, b) => pieces(b) - pieces(a))
		.slice(0, Number(values.limit ?? 12));
	const { round, pin, stopLine, spent } = await account(
		!values.estimate,
		"limit-qpc",
	);
	const sizes = (values.sizes ?? "").split(",").map(Number);
	const projecting = jevCache({
		...(values.model ? { model: values.model } : {}),
		allowFloatingModel: values["allow-floating-model"],
		offline: true,
		project: standInAnswers,
	});
	await questionsPerCall({
		cases,
		jev: projecting,
		sizes,
		baselineRepetitions: 3,
	});
	const priced = priceProjection(projecting.projection);
	console.log(projectionText(priced));
	if (values.estimate) {
		printEstimate(round, spent, stopLine, projectedSpend(priced));
		return;
	}
	guardProjectedSpend({ round, spent, stopLine, priced });
	const provenance = await provenanceOf({ packageRoot, repository, cli });
	const calls: CallRecord[] = [];
	let fresh = 0;
	const jev = jevCache({
		...(values.model ? { model: values.model } : {}),
		allowFloatingModel: values["allow-floating-model"],
		beforeSpend: () => {
			if (spent + fresh >= stopLine)
				throw Error(
					`Round ${round.id} reached its stop line: ${spent + fresh} of ${stopLine} fresh jev input tokens`,
				);
		},
		onSpend: (tokens) => {
			fresh += tokens;
		},
	});
	const results = await questionsPerCall({
		cases,
		jev,
		sizes,
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
		round: round.id,
		pin: pin.hash,
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
else if (command === "replay") await replayRun();
else if (command === "noise") await noise();
else if (command === "sweep") await sweep();
else if (command === "ledger") await ledger();
else if (command === "limit-qpc") await limitQuestionsPerCall();
else if (command === "round") await roundCommand();
else
	throw Error(
		"Commands: freeze, run, replay, report, compare, noise, sweep, ledger, round, limit-qpc",
	);
