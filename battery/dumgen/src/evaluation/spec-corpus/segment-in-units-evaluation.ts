/**
 * Scores a `segment.inUnits` answer against its Spec Record. Only ResolvableText
 * Segments are scored; whether a unit also lists whitespace or punctuation
 * does not count.
 */
import type * as Dumspec from "dumspec/types";
import type {
	GoldUnitSource,
	SegmentInUnitsFacts,
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
	Unit,
} from "./segment-in-units.js";

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
 * One gold unit and the returned units that share a Segment with it. It
 * matches when exactly one does, with the same Segments and route.
 */
export type UnitCheck = {
	readonly source: GoldUnitSource;
	/** The gold unit's Segments' text, for reading a run. */
	readonly text: string;
	readonly expected: Unit;
	readonly returned: readonly Unit[];
	readonly verdict: UnitVerdict;
};

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
	 * A Partial record passes when every scored gold unit matches; a Full
	 * record also needs its Sentence check. Absent when nothing is scored,
	 * so promptsmith counts the case Unscored.
	 */
	readonly contractPass?: boolean;
	readonly coverage: Dumspec.Coverage;
	readonly matched: number;
	readonly scored: number;
	readonly stubbed: number;
	readonly units: readonly UnitCheck[];
	readonly sentence?: SentenceCheck;
};

function awaitsForeignScoring(route: Unit["route"]): boolean {
	return route === "Unresolved" || route.family === "Foreign";
}

function sameRoute(left: Unit["route"], right: Unit["route"]): boolean {
	if (left === "Unresolved" || right === "Unresolved") return left === right;
	return (
		left.language === right.language &&
		left.family === right.family &&
		left.kind === right.kind
	);
}

function verdictOf(
	expected: Unit,
	touching: readonly { unit: Unit; scored: readonly number[] }[],
): UnitVerdict {
	if (awaitsForeignScoring(expected.route)) return "Stub";
	const [only, ...more] = touching;
	if (!only) return "Missing";
	if (more.length > 0 || !sameSegments(only.scored, expected.segments))
		return "WrongSegments";
	return sameRoute(only.unit.route, expected.route) ? "Match" : "WrongRoute";
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
				const verdict = verdictOf(expected, touching);
				return {
					source,
					text: expected.segments
						.map((segment) => segments[segment]?.text ?? "")
						.join(" "),
					expected,
					returned: touching.map(({ unit }) => unit),
					verdict,
				};
			},
		);
		const scoredUnits = units.filter(({ verdict }) => verdict !== "Stub");
		const matched = scoredUnits.filter(
			({ verdict }) => verdict === "Match",
		).length;
		const sentence =
			caseFacts.coverage === "Full"
				? sentenceCheck(
						segments,
						args.idealOutput.units,
						returned.map(({ scored }) => scored),
						args.output.units,
					)
				: undefined;
		const unitsPass = matched === scoredUnits.length;
		const contractPass = sentence
			? sentence.pass && unitsPass
			: scoredUnits.length > 0
				? unitsPass
				: undefined;
		return {
			...(contractPass === undefined ? {} : { contractPass }),
			coverage: caseFacts.coverage,
			matched,
			scored: scoredUnits.length,
			stubbed: units.length - scoredUnits.length,
			units,
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
