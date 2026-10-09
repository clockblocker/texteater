/**
 * The headline rates of a `segment.inUnits` evaluation run, read from the
 * evaluator's per-case counts: what `cli/evaluate.ts` prints beside the
 * run's summary.
 */
import { recordOf } from "../../records.js";
import {
	hasMembership,
	type SegmentInUnitsEvaluation,
} from "./segment-in-units-evaluation.js";
import {
	type HoverCheck,
	hoverRates,
	sumHover,
} from "./segment-in-units-grouping.js";

export type Counts = { [key: string]: number | Counts };
type Scored = { readonly evaluation?: unknown };

/** Adds the evaluator's counts, nested ones included, into `totals`; lists hold per-unit detail and are skipped. */
function addCounts(totals: Counts, evaluation: object): void {
	for (const [key, value] of Object.entries(evaluation)) {
		const total = totals[key];
		if (typeof value === "number")
			totals[key] = (typeof total === "number" ? total : 0) + value;
		else if (value && typeof value === "object" && !Array.isArray(value)) {
			const nested = typeof total === "object" ? total : {};
			addCounts(nested, value);
			if (Object.keys(nested).length > 0) totals[key] = nested;
		}
	}
}

/** Every repetition's evaluation of a run, a failed repetition left out. */
export function evaluationsOf(run: {
	readonly cases: readonly (Scored & {
		readonly repetitions?: readonly Scored[];
	})[];
}): object[] {
	return run.cases
		.flatMap((record) => record.repetitions ?? [record])
		.flatMap(({ evaluation }) =>
			evaluation && typeof evaluation === "object" ? [evaluation] : [],
		);
}

/** The evaluations' counts, nested ones included, summed. */
export function totalsOf(evaluations: readonly object[]): Counts {
	const totals: Counts = {};
	for (const evaluation of evaluations) addCounts(totals, evaluation);
	return totals;
}

const headline = [
	"membership",
	"tolerantMatched",
	"matched",
] as const satisfies readonly (keyof SegmentInUnitsEvaluation)[];

/**
 * The evaluator's counts summed over every repetition it scored, and the
 * ADR 0008 headline rates over the scored gold units: membership, then the
 * tolerant and the strict route, and membership of multi-piece gold units
 * with the units it is counted over. Beside them, the evaluator's hover B-cubed
 * (#701) on every record, on Full records only and over multi-piece gold
 * units, each with the hovered Segments it is counted over. A repetition
 * that failed before scoring shows in the run's summary instead.
 */
export function segmentInUnitsMetrics(run: {
	readonly cases: readonly (Scored & {
		readonly repetitions?: readonly Scored[];
	})[];
}) {
	const evaluations = evaluationsOf(run);
	const totals = totalsOf(evaluations);
	const count = (key: string) => {
		const value = totals[key];
		return typeof value === "number" ? value : 0;
	};
	const contract = evaluations.flatMap((evaluation) =>
		"contractPass" in evaluation ? [evaluation.contractPass === true] : [],
	);
	const hoverOf = (scope: readonly Partial<SegmentInUnitsEvaluation>[]) =>
		sumHover(
			scope.flatMap(({ hover }): HoverCheck[] => (hover ? [hover] : [])),
		);
	const multi = evaluations
		.flatMap(
			(evaluation: Partial<SegmentInUnitsEvaluation>) =>
				evaluation.units ?? [],
		)
		.filter(
			(check) =>
				check.verdict !== "Stub" && check.expected.segments.length > 1,
		);
	const hover = hoverOf(evaluations);
	const fullHover = hoverOf(
		evaluations.filter(
			(evaluation: Partial<SegmentInUnitsEvaluation>) =>
				evaluation.coverage === "Full",
		),
	);
	return {
		evaluated: evaluations.length,
		rates: {
			...recordOf(headline, (key) => count(key) / count("scored")),
			contractPass: contract.filter(Boolean).length / contract.length,
			multiMembership: {
				rate: multi.filter(hasMembership).length / multi.length,
				units: multi.length,
			},
			hover: { ...hoverRates(hover), segments: hover.segments },
			fullHover: {
				...hoverRates(fullHover),
				segments: fullHover.segments,
			},
			multiHover: {
				...hoverRates(hover.multi),
				segments: hover.multi.segments,
			},
		},
		totals,
	};
}
