/** The lab's `replay`: a raw run replayed offline against today's code. */
import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import { arms } from "../../lab/segmentation/de/arms/index.js";
import { loadSet, setNameOf } from "../../lab/segmentation/harness/corpus.js";
import { readManifest } from "../../lab/segmentation/harness/evidence.js";
import type { CallRecord } from "../../lab/segmentation/harness/jev-cache.js";
import { pinDrift, pinText } from "../../lab/segmentation/harness/round.js";
import { loadLabRun } from "../../lab/segmentation/harness/run.js";
import {
	account,
	evidenceRoot,
	jevCache,
	labRoot,
	setsRoot,
	values,
} from "./context.js";

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
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
