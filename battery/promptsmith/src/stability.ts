import { canonicalJson } from "common-utils";
import {
	type EvaluationVerdict,
	evaluationVerdict,
	summarizeQuality,
} from "./quality.js";

type Repetition = {
	readonly status: string;
	readonly output?: unknown;
	readonly evaluation?: unknown;
};
type RepeatedRecord = {
	readonly status: string;
	readonly output?: unknown;
	readonly evaluation?: unknown;
	readonly repetitions?: readonly Repetition[];
};

/** Validates the requested repetitions per case. One is the default and stores no repetition fields. */
export function repetitionCount(requested: number | undefined): number {
	const count = requested ?? 1;
	if (!Number.isInteger(count) || count < 1)
		throw Error("Repetitions must be a whole number of at least 1");
	return count;
}

/** The first repetition that did not execute cleanly, otherwise the first repetition. */
function representativeRepetition<T extends Repetition>(
	repetitions: readonly T[],
): T {
	const representative =
		repetitions.find((repetition) => repetition.status !== "Success") ??
		repetitions[0];
	if (!representative) throw Error("A case needs at least one repetition");
	return representative;
}

/** A single repetition keeps the historical record shape; more add every repetition and its stability. */
export function repeatedCaseRecord<B extends object, T extends Repetition>(
	identity: B,
	repetitions: readonly T[],
) {
	return {
		...identity,
		...representativeRepetition(repetitions),
		...(repetitions.length > 1
			? { repetitions, stability: summarizeCaseStability(repetitions) }
			: {}),
	};
}

/**
 * A case flips when at least one repetition passed the evaluator's contract
 * and at least one other did not. Interrupted repetitions never count.
 */
function summarizeCaseStability(repetitions: readonly Repetition[]) {
	const quality = summarizeQuality(repetitions);
	const completed = repetitions.filter(
		(repetition) => repetition.status !== "Interrupted",
	).length;
	return {
		repetitions: repetitions.length,
		...quality,
		flipped: quality.passed > 0 && quality.passed < completed,
		distinctOutputs: new Set(
			repetitions
				.filter((repetition) => repetition.output !== undefined)
				.map((repetition) => canonicalJson(repetition.output)),
		).size,
	};
}

export function summarizeRunStability(
	records: readonly { readonly repetitions?: readonly Repetition[] }[],
	repetitions: number,
) {
	const cases = records.map((record) =>
		summarizeCaseStability(record.repetitions ?? []),
	);
	return {
		repetitions,
		flipped: cases.filter((stability) => stability.flipped).length,
		varyingOutputs: cases.filter(
			(stability) => stability.distinctOutputs > 1,
		).length,
		quality: summarizeQuality(
			records.flatMap((record) => record.repetitions ?? []),
		),
	};
}

/** True when stored repetition fields disagree with their manifest or with the repetitions they summarize. */
export function repetitionsMismatch(run: {
	readonly manifest: { readonly repetitions?: number };
	readonly cases: readonly (RepeatedRecord & {
		readonly caseId?: unknown;
		readonly input?: unknown;
		readonly idealOutput?: unknown;
		readonly stability?: unknown;
	})[];
	readonly summary: { readonly stability?: unknown };
}): boolean {
	const expected = run.manifest.repetitions;
	if (expected === undefined)
		return (
			run.summary.stability !== undefined ||
			run.cases.some(
				(record) =>
					record.repetitions !== undefined ||
					record.stability !== undefined,
			)
		);
	return (
		canonicalJson(run.summary.stability ?? null) !==
			canonicalJson(summarizeRunStability(run.cases, expected)) ||
		run.cases.some((record) => {
			const {
				caseId: _caseId,
				input: _input,
				idealOutput: _idealOutput,
				repetitions,
				stability,
				...attempt
			} = record;
			if (repetitions?.length !== expected) return true;
			return (
				canonicalJson(stability ?? null) !==
					canonicalJson(summarizeCaseStability(repetitions)) ||
				canonicalJson(attempt) !==
					canonicalJson(representativeRepetition(repetitions))
			);
		})
	);
}

export type ComparedVerdict = EvaluationVerdict | "Mixed";

/** Repetitions that are not interrupted and disagree are Mixed; every flipped case is Mixed. */
export function comparedVerdict(record: RepeatedRecord): ComparedVerdict {
	if (!record.repetitions) return evaluationVerdict(record);
	const verdicts = new Set(
		record.repetitions
			.filter((repetition) => repetition.status !== "Interrupted")
			.map(evaluationVerdict),
	);
	const [only] = verdicts;
	if (!only) return "Unscored";
	return verdicts.size === 1 ? only : "Mixed";
}

/** The most frequent output by stable JSON; ties go to the earliest repetition. */
export function modalOutput(record: RepeatedRecord): unknown {
	if (!record.repetitions) return record.output;
	const counts = new Map<string, { output: unknown; count: number }>();
	for (const { output } of record.repetitions) {
		if (output === undefined) continue;
		const key = canonicalJson(output);
		const seen = counts.get(key);
		if (seen) seen.count++;
		else counts.set(key, { output, count: 1 });
	}
	let modal: { output: unknown; count: number } | undefined;
	for (const candidate of counts.values())
		if (!modal || candidate.count > modal.count) modal = candidate;
	return modal?.output;
}
