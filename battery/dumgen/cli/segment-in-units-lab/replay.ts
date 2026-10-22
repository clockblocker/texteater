/** The lab's `replay`: a raw run replayed offline against today's code. */
import { canonicalJson } from "common-utils";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type { ArmResult } from "../../lab/segmentation/de/arm.js";
import { arms } from "../../lab/segmentation/de/arms/index.js";
import { loadSet, setNameOf } from "../../lab/segmentation/harness/corpus.js";
import { readManifest } from "../../lab/segmentation/harness/evidence.js";
import type { CallRecord } from "../../lab/segmentation/harness/jev-cache.js";
import { pinDrift, pinText } from "../../lab/segmentation/harness/round.js";
import {
	type LabRun,
	loadLabRun,
	type RepetitionRecord,
} from "../../lab/segmentation/harness/run.js";
import {
	account,
	evidenceRoot,
	jevCache,
	labRoot,
	runLab,
	setsRoot,
	values,
} from "./context.js";

/** What a replay found so far. */
type Tally = {
	compared: number;
	identical: number;
	fresh: number;
	readonly differing: string[];
	readonly failed: string[];
	readonly failedBefore: string[];
};

/** Adds one replayed repetition, at `at`, to the tally against what the run recorded. */
function count(
	tally: Tally,
	at: string,
	recorded: RepetitionRecord,
	exit: Exit.Exit<ArmResult, unknown>,
	calls: readonly CallRecord[],
) {
	if (Exit.isFailure(exit)) {
		const error = Cause.squash(exit.cause);
		const message = error instanceof Error ? error.message : String(error);
		(recorded.error ? tally.failedBefore : tally.failed).push(
			`${at}: ${message}`,
		);
		return;
	}
	const result = exit.value;
	tally.fresh += calls.filter((call) => !call.cached).length;
	if (recorded.error) {
		tally.differing.push(`${at}: the run failed, the replay succeeds`);
		return;
	}
	const stored = recorded.outputs ?? {};
	const policies = new Set([
		...Object.keys(stored),
		...Object.keys(result.outputs),
	]);
	for (const policy of policies) {
		tally.compared++;
		if (
			canonicalJson(result.outputs[policy] ?? null) ===
			canonicalJson(stored[policy] ?? null)
		)
			tally.identical++;
		else tally.differing.push(`${at} ${policy}`);
	}
	if (result.primary !== recorded.primary)
		tally.differing.push(
			`${at}: primary ${result.primary}, was ${recorded.primary}`,
		);
}

/**
 * Replays a raw run offline with today's code and compares every policy's
 * output, per case and repetition, with what the run stored. A cache miss
 * fails its case. Nothing is asked, written or ledgered; the exit code is 1
 * when an output differs or a case the run completed fails.
 */
export async function replayRun() {
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
	const tally: Tally = {
		compared: 0,
		identical: 0,
		fresh: 0,
		differing: [],
		failed: [],
		failedBefore: [],
	};
	// Each case's repetitions in turn, `--concurrency` cases at once.
	const replayCase = (caseRun: LabRun["cases"][number]) =>
		Effect.gen(function* () {
			const labCase = byId.get(caseRun.id);
			if (!labCase) throw Error(`${set.name} has no case ${caseRun.id}`);
			for (const [
				repetition,
				recorded,
			] of caseRun.repetitions.entries()) {
				const calls: CallRecord[] = [];
				const exit = yield* Effect.exit(
					arm.run(labCase.input, {
						jev,
						repetition:
							repetition + (original.repetitionOffset ?? 0),
						calls,
						options: original.options,
					}),
				);
				count(
					tally,
					`${caseRun.id}#${repetition}`,
					recorded,
					exit,
					calls,
				);
			}
		});
	await runLab(
		Effect.forEach(original.cases, replayCase, {
			concurrency: Number(values.concurrency),
			discard: true,
		}),
	);
	const { compared, identical, fresh, differing, failed, failedBefore } =
		tally;
	console.log(
		`replay ${runId} (${original.arm} ${canonicalJson(original.options)}, ${original.cases.length} cases × ${original.repetitions}, set ${set.name}@${set.hash}): ${identical}/${compared} policy outputs identical, ${differing.length} differ, ${failed.length} case repetitions fail, ${failedBefore.length} failed in the run too, ${fresh} fresh calls`,
	);
	for (const line of [...differing, ...failed].slice(0, 40))
		console.log(`  ${line}`);
	if (differing.length > 0 || failed.length > 0) process.exitCode = 1;
}
