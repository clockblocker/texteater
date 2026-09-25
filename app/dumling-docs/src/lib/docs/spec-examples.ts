import { findSpecRecord, loadSpecRecords } from "dumspec";
import type * as Dumspec from "dumspec/types";

import type { AttestedAttestation } from "./document-shapes.ts";

let records: readonly Dumspec.SpecRecord[] | undefined;

/** Every dumspec Spec Record, loaded once per process. */
export function specRecords(): readonly Dumspec.SpecRecord[] {
	records ??= loadSpecRecords();
	return records;
}

/**
 * The record's sentence with the target's members in brackets. Members that
 * only whitespace separates share one bracket: `Es [zog] der ... [an];`,
 * `[Der Kiefer] schmerzte`, `[i]m Wald`.
 */
function markedSentence(
	record: Dumspec.SpecRecord,
	target: Dumspec.SpecTarget,
): string {
	const runs: [number, number][] = [];
	for (const index of target.memberSegmentIndices) {
		const run = runs.at(-1);
		const onlyWhitespaceBetween =
			run !== undefined &&
			record.segments
				.slice(run[1] + 1, index)
				.every((segment) => segment.kind === "Whitespace");
		if (run !== undefined && onlyWhitespaceBetween) run[1] = index;
		else runs.push([index, index]);
	}
	const opens = new Set(runs.map(([start]) => start));
	const closes = new Set(runs.map(([, end]) => end));
	return record.segments
		.map(
			(segment, index) =>
				`${opens.has(index) ? "[" : ""}${segment.text}${closes.has(index) ? "]" : ""}`,
		)
		.join("");
}

/** One target of a loaded Spec Record, as a page example. */
export function exampleFor(
	record: Dumspec.SpecRecord,
	target: number,
): AttestedAttestation {
	const chosen = record.targets[target];
	if (chosen === undefined) {
		throw new Error(`Spec Record ${record.id} has no target ${target}.`);
	}
	return {
		attestation: chosen.attestation,
		record: record.id,
		sentenceMarkdown: markedSentence(record, chosen),
		target,
	};
}

/** One target of a dumspec Spec Record, as a page example. */
export function specExample(
	id: Dumspec.SpecRecordId,
	target = 0,
): AttestedAttestation {
	const record = findSpecRecord(specRecords(), id);
	if (record === undefined) {
		throw new Error(`No dumspec Spec Record ${id}.`);
	}
	return exampleFor(record, target);
}

/** Every target of every Spec Record, in record order. */
export function allSpecExamples(): AttestedAttestation[] {
	return specRecords().flatMap((record) =>
		record.targets.map((_, target) => exampleFor(record, target)),
	);
}
