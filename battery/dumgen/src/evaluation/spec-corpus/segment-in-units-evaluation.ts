/**
 * Scores a `segment.inUnits` answer against its Spec Record. Only ResolvableText
 * Segments are scored; whether a unit also lists whitespace or punctuation
 * does not count. Membership comes first and the route second, tolerating
 * the Kind confusions of Dumgen ADR 0008 and accepting a borderline unit
 * whose route variants hold the gold route. Beside the per-unit verdicts,
 * each case carries its grouping: Segment pairs and the units merged
 * across or split (#701).
 */
import type * as Dumspec from "dumspec/types";
import type {
	GoldUnitSource,
	SegmentInUnitsFacts,
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
	Unit,
} from "./segment-in-units.js";
import {
	awaitsForeignScoring,
	checkGrouping,
	type GroupingCheck,
} from "./segment-in-units-grouping.js";
import {
	acceptableRoute,
	sameRoute,
} from "./segment-in-units-route-tolerance.js";

/**
 * `Stub`: the gold unit is `Unresolved` or foreign material, which is not
 * scored until German `segment.inUnits` routes foreign words (#730) and its
 * confidence line for `Unresolved` is set (#701).
 */
export type UnitVerdict =
	| "Match"
	| "WrongSegments"
	| "WrongRoute"
	| "Missing"
	| "Stub";

/**
 * One gold unit and the returned units that share a Segment with it. Its
 * membership holds when exactly one does, with the same Segments (`Match`
 * or `WrongRoute`); it matches strictly when that unit's route is the same
 * too, a borderline unit's first route. A `WrongRoute` says whether ADR
 * 0008 accepts the returned unit's route: a tolerated confusion, or the
 * gold route among its variants.
 */
export type UnitCheck = {
	readonly source: GoldUnitSource;
	/** The gold unit's Segments' text, for reading a run. */
	readonly text: string;
	readonly expected: Unit;
	readonly returned: readonly Unit[];
} & UnitJudgment;

type UnitJudgment =
	| { readonly verdict: Exclude<UnitVerdict, "WrongRoute"> }
	| { readonly verdict: "WrongRoute"; readonly tolerated: boolean };

/** The gold unit's Segment set came back exactly, whatever its route. */
export const hasMembership = (check: UnitCheck) =>
	check.verdict === "Match" || check.verdict === "WrongRoute";

/** Membership with a route that is the same or a tolerated confusion. */
export const tolerantMatch = (check: UnitCheck) =>
	check.verdict === "Match" ||
	(check.verdict === "WrongRoute" && check.tolerated);

/**
 * A Full record's whole Sentence: every ResolvableText Segment in exactly one
 * returned unit, and every returned unit one of the record's, with each No
 * Target entry a unit of its own. A unit merged across gold units shows in
 * `falseUnits`.
 */
export type SentenceCheck = {
	readonly pass: boolean;
	readonly falseUnits: readonly Unit[];
	readonly uncovered: readonly number[];
	readonly repeated: readonly number[];
};

export type SegmentInUnitsEvaluation = {
	/**
	 * Membership, the headline of ADR 0008: a Partial record passes when
	 * every scored gold unit's Segment set comes back exactly, whatever its
	 * route; a Full record also needs its Sentence check, which is about
	 * membership only. Route misses show in `tolerantMatched` and `matched`
	 * instead. Absent when nothing is scored, so promptsmith counts the case
	 * Unscored.
	 */
	readonly contractPass?: boolean;
	readonly coverage: Dumspec.Coverage;
	/** Scored gold units whose Segment set came back exactly. */
	readonly membership: number;
	/** Of those, the units whose route is acceptable: the same, a tolerated confusion, or among the variants. */
	readonly tolerantMatched: number;
	/** Of those, the units whose route is the same: the strict match. */
	readonly matched: number;
	readonly scored: number;
	readonly stubbed: number;
	/**
	 * Of the units with membership, those whose returned unit carries route
	 * variants: ADR 0008 asks how often a unit leaves the route to the click.
	 */
	readonly withVariants: number;
	/** Their variant routes, summed; over `withVariants`, the mean variant count. */
	readonly variantRoutes: number;
	readonly units: readonly UnitCheck[];
	/** The Segment pairs kept together and the units merged across or split. */
	readonly grouping: GroupingCheck;
	readonly sentence?: SentenceCheck;
};

function verdictOf(
	expected: Unit,
	touching: readonly { unit: Unit; scored: readonly number[] }[],
): UnitJudgment {
	if (awaitsForeignScoring(expected.route)) return { verdict: "Stub" };
	const [only, ...more] = touching;
	if (!only) return { verdict: "Missing" };
	if (more.length > 0 || !sameSegments(only.scored, expected.segments))
		return { verdict: "WrongSegments" };
	if (sameRoute(expected.route, only.unit.route)) return { verdict: "Match" };
	return {
		verdict: "WrongRoute",
		tolerated: acceptableRoute(expected.route, only.unit),
	};
}

const sameSegments = (left: readonly number[], right: readonly number[]) =>
	left.length === right.length &&
	[...left].sort((a, b) => a - b).join() ===
		[...right].sort((a, b) => a - b).join();

/**
 * The evaluator for a projected `segment.inUnits` corpus, reading each case's
 * Coverage and unit sources from `facts`.
 */
export function evaluateSegmentInUnits(
	facts: Readonly<Record<string, SegmentInUnitsFacts>>,
) {
	return (args: {
		readonly caseId: string;
		readonly input: SegmentInUnitsInput;
		readonly idealOutput: SegmentInUnitsOutput;
		readonly output: SegmentInUnitsOutput;
	}): SegmentInUnitsEvaluation => {
		const caseFacts = facts[args.caseId];
		if (!caseFacts)
			throw Error(`No segment.inUnits facts for ${args.caseId}`);
		const { segments } = args.input;
		const unscored = (index: number) =>
			segments[index] !== undefined &&
			segments[index].kind !== "ResolvableText";
		const returned = args.output.units.map((unit) => ({
			unit,
			scored: unit.segments.filter((index) => !unscored(index)),
		}));
		const units = args.idealOutput.units.map(
			(expected, index): UnitCheck => {
				const source = caseFacts.sources[index];
				if (!source)
					throw Error(
						`${args.caseId} has no source for unit ${index}`,
					);
				const touching = returned.filter(({ scored }) =>
					scored.some((segment) =>
						expected.segments.includes(segment),
					),
				);
				return {
					source,
					text: expected.segments
						.map((segment) => segments[segment]?.text ?? "")
						.join(" "),
					expected,
					returned: touching.map(({ unit }) => unit),
					...verdictOf(expected, touching),
				};
			},
		);
		const scoredUnits = units.filter(({ verdict }) => verdict !== "Stub");
		const membership = scoredUnits.filter(hasMembership).length;
		const tolerantMatched = scoredUnits.filter(tolerantMatch).length;
		const matched = scoredUnits.filter(
			({ verdict }) => verdict === "Match",
		).length;
		const variantCounts = scoredUnits
			.filter(hasMembership)
			.map((check) => check.returned[0]?.variants?.length ?? 0)
			.filter((count) => count > 0);
		const sentence =
			caseFacts.coverage === "Full"
				? sentenceCheck(
						segments,
						args.idealOutput.units,
						returned.map(({ scored }) => scored),
						args.output.units,
					)
				: undefined;
		const unitsPass = membership === scoredUnits.length;
		const contractPass = sentence
			? sentence.pass && unitsPass
			: scoredUnits.length > 0
				? unitsPass
				: undefined;
		return {
			...(contractPass === undefined ? {} : { contractPass }),
			coverage: caseFacts.coverage,
			membership,
			tolerantMatched,
			matched,
			scored: scoredUnits.length,
			stubbed: units.length - scoredUnits.length,
			withVariants: variantCounts.length,
			variantRoutes: variantCounts.reduce(
				(total, count) => total + count,
				0,
			),
			units,
			grouping: checkGrouping({
				segments,
				ideal: args.idealOutput.units,
				returned: args.output.units,
			}),
			...(sentence ? { sentence } : {}),
		};
	};
}

function sentenceCheck(
	segments: SegmentInUnitsInput["segments"],
	ideal: readonly Unit[],
	scored: readonly (readonly number[])[],
	returned: readonly Unit[],
): SentenceCheck {
	const counts = new Map<number, number>();
	for (const unit of scored)
		for (const segment of new Set(unit))
			counts.set(segment, (counts.get(segment) ?? 0) + 1);
	const resolvable = segments.flatMap(({ kind }, index) =>
		kind === "ResolvableText" ? [index] : [],
	);
	const uncovered = resolvable.filter((index) => !counts.has(index));
	const repeated = [...counts]
		.filter(([, count]) => count > 1)
		.map(([segment]) => segment)
		.sort((a, b) => a - b);
	const falseUnits = returned.filter(
		(_, index) =>
			(scored[index]?.length ?? 0) > 0 &&
			!ideal.some((unit) =>
				sameSegments(unit.segments, scored[index] ?? []),
			),
	);
	return {
		pass:
			falseUnits.length === 0 &&
			uncovered.length === 0 &&
			repeated.length === 0,
		falseUnits,
		uncovered,
		repeated,
	};
}
