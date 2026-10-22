/**
 * The lab's `run` and `noise`: an arm run with repetitions, and a rerun of a
 * baseline's configuration measuring its noise floor.
 */
import { canonicalJson } from "common-utils";
import { arms } from "../../lab/segmentation/de/arms/index.js";
import {
	loadSet,
	type SetName,
	setNameOf,
	subset,
} from "../../lab/segmentation/harness/corpus.js";
import {
	readManifest,
	readManifests,
	readOutcomes,
	writeManifest,
	writeNoise,
	writeOutcomes,
} from "../../lab/segmentation/harness/evidence.js";
import { transportText } from "../../lab/segmentation/harness/jev-cache.js";
import {
	appendLedger,
	spendOf,
} from "../../lab/segmentation/harness/ledger.js";
import { primaryOf } from "../../lab/segmentation/harness/metrics.js";
import { noiseFloor } from "../../lab/segmentation/harness/noise.js";
import {
	outcomePolicies,
	outcomesOf,
} from "../../lab/segmentation/harness/outcomes.js";
import {
	dumcorpusHashOf,
	provenanceOf,
	type RunManifest,
} from "../../lab/segmentation/harness/provenance.js";
import {
	guardProjectedSpend,
	pinText,
	priceProjection,
	projectedSpend,
	projectionText,
	standInAnswers,
} from "../../lab/segmentation/harness/round.js";
import { runArm, saveLabRun } from "../../lab/segmentation/harness/run.js";
import {
	account,
	cliSources,
	evidenceRoot,
	guardDirty,
	jevCache,
	labRoot,
	ledgerPath,
	optionsOf,
	type Provenance,
	packageRoot,
	plainCases,
	printEstimate,
	repository,
	setsRoot,
	values,
} from "./context.js";
import { report } from "./report.js";
import { percent } from "./text.js";

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

export async function run() {
	const provenance = await provenanceOf({
		packageRoot,
		repository,
		cliSources,
	});
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
 * Reruns a baseline's exact configuration at fresh repetition indices and
 * records the per-bucket flip rate against it for every policy.
 */
export async function noise() {
	const baselineId = values.run ?? "";
	const baseline = await readManifest(evidenceRoot, baselineId);
	const baselineRows = await readOutcomes(labRoot, baselineId);
	if (!baseline || !baselineRows)
		throw Error(
			`--run ${baselineId} needs a committed manifest and its outcomes in .runs/; runs made before manifests cannot be rerun exactly`,
		);
	const provenance = await provenanceOf({
		packageRoot,
		repository,
		cliSources,
	});
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
