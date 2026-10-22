/** The lab's `sweep`: every policy of one run against a baseline policy (#762). */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson } from "common-utils";
import {
	focusOf,
	loadSet,
	setNameOf,
} from "../../lab/segmentation/harness/corpus.js";
import { runDirectory } from "../../lab/segmentation/harness/evidence.js";
import {
	policiesOf,
	primaryOf,
	summarizePolicy,
} from "../../lab/segmentation/harness/metrics.js";
import { outcomesOf } from "../../lab/segmentation/harness/outcomes.js";
import { loadLabRun } from "../../lab/segmentation/harness/run.js";
import { sweepRows, sweepTable } from "../../lab/segmentation/harness/sweep.js";
import {
	evidenceRoot,
	labRoot,
	plainCases,
	setsRoot,
	values,
} from "./context.js";

/**
 * Reads every policy of one run against a baseline policy (#762): the
 * sweep table, written beside the run's evidence. `--replay` also counts
 * the case-repetitions whose baseline output equals another run's.
 */
export async function sweep() {
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
