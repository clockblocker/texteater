/**
 * Scores a stored lab run with the harness evaluator (#731) and summarizes
 * it per assembly policy the way ADR 0008 ranks it: membership first (all,
 * one-piece, multi-piece and discontinuous gold units, and the shape of
 * each miss), then its consistency across repetitions, then the route,
 * tolerant and strict. Grouping sits beside membership (#701): what
 * hovering each Segment highlights (B-cubed), Segment pairs kept together,
 * returned units merged across gold units and gold units split. Also Full-record sentence passes, case flips, cost and
 * latency, and breakdowns by gold route and cited Rule and the calibration
 * of route and membership judgments.
 */
import { canonicalJson } from "common-utils";
import {
	expletiveForms,
	particleForms,
	reflexiveForms,
} from "../../../src/segment/de/candidates.js";
import { authoredInventory } from "../../../src/segment/de/inventory.js";
import { keyOf } from "../../../src/segment/de/routes.js";
import type { Unit } from "../../evaluation/spec-corpus/segment-in-units.js";
import {
	evaluateSegmentInUnits,
	hasMembership,
	type SegmentInUnitsEvaluation,
	tolerantMatch,
	type UnitCheck,
} from "../../evaluation/spec-corpus/segment-in-units-evaluation.js";
import {
	checkHover,
	type GroupingCheck,
	type HoverCheck,
	hoverRates,
} from "../../evaluation/spec-corpus/segment-in-units-grouping.js";
import { toleratedPairOf } from "../../evaluation/spec-corpus/segment-in-units-route-tolerance.js";
import type { LabCase } from "./corpus.js";
import type { CallRecord } from "./jev-cache.js";
import type { LabRun, RepetitionRecord } from "./run.js";

type Tally = {
	scored: number;
	match: number;
	wrongSegments: number;
	/** Every WrongRoute, tolerated ones included. */
	wrongRoute: number;
	/** The WrongRoutes ADR 0008 tolerates. */
	toleratedRoute: number;
	missing: number;
	stub: number;
	/** WrongSegments by shape: see `membershipMiss`. */
	split: number;
	merged: number;
	crossed: number;
	/** Units with membership whose returned unit carries route variants, and their variant routes. */
	variantUnits: number;
	variantRoutes: number;
	multiScored: number;
	multiMembership: number;
	multiMatch: number;
	singleScored: number;
	singleMembership: number;
	singleMatch: number;
	/** Multi-piece gold units whose Segments are not contiguous, and their membership. */
	discontinuousScored: number;
	discontinuousMembership: number;
	/** Segment pairs inside scored gold units, and those a returned unit kept together: pair recall. */
	goldPairs: number;
	recalledPairs: number;
	/** Returned Segment pairs on Full records, and those inside one gold unit: pair precision. */
	fullPairs: number;
	fullTruePairs: number;
	/**
	 * Returned Segment pairs the gold decides on any record, at least one
	 * Segment in an asserted unit, and those inside one gold unit.
	 */
	decidedPairs: number;
	truePairs: number;
	/** Returned units joining Segments of two or more gold units. */
	overMerged: number;
	/** Scored gold units split across two or more returned units. */
	underMerged: number;
	/**
	 * B-cubed (#701): the hovered Segments of scored gold units, their
	 * precision and recall summed, the Segments they highlight, and the
	 * highlighted Segments no gold unit asserts.
	 */
	hoverSegments: number;
	hoverPrecisionSum: number;
	hoverRecallSum: number;
	hoverHighlighted: number;
	hoverUnasserted: number;
	/** The same on Full records only. */
	fullHoverSegments: number;
	fullHoverPrecisionSum: number;
	fullHoverRecallSum: number;
	/** The same over Segments of multi-piece gold units. */
	multiHoverSegments: number;
	multiHoverPrecisionSum: number;
	multiHoverRecallSum: number;
	contractCases: number;
	contractPass: number;
	fullCases: number;
	fullPass: number;
	errors: number;
};

const emptyTally = (): Tally => ({
	scored: 0,
	match: 0,
	wrongSegments: 0,
	wrongRoute: 0,
	toleratedRoute: 0,
	missing: 0,
	stub: 0,
	split: 0,
	merged: 0,
	crossed: 0,
	variantUnits: 0,
	variantRoutes: 0,
	multiScored: 0,
	multiMembership: 0,
	multiMatch: 0,
	singleScored: 0,
	singleMembership: 0,
	singleMatch: 0,
	discontinuousScored: 0,
	discontinuousMembership: 0,
	goldPairs: 0,
	recalledPairs: 0,
	fullPairs: 0,
	fullTruePairs: 0,
	decidedPairs: 0,
	truePairs: 0,
	overMerged: 0,
	underMerged: 0,
	hoverSegments: 0,
	hoverPrecisionSum: 0,
	hoverRecallSum: 0,
	hoverHighlighted: 0,
	hoverUnasserted: 0,
	fullHoverSegments: 0,
	fullHoverPrecisionSum: 0,
	fullHoverRecallSum: 0,
	multiHoverSegments: 0,
	multiHoverPrecisionSum: 0,
	multiHoverRecallSum: 0,
	contractCases: 0,
	contractPass: 0,
	fullCases: 0,
	fullPass: 0,
	errors: 0,
});

export type CaseScore = {
	readonly evaluation?: SegmentInUnitsEvaluation;
	readonly error?: string;
};

/** Scores one repetition's output for one policy. */
export function scoreCase(
	labCase: LabCase,
	repetition: RepetitionRecord,
	policy: string,
): CaseScore {
	const output = repetition.outputs?.[policy];
	if (!output)
		return { error: repetition.error ?? `No output for ${policy}` };
	const evaluate = evaluateSegmentInUnits({ [labCase.id]: labCase.facts });
	return {
		evaluation: evaluate({
			caseId: labCase.id,
			input: labCase.input,
			idealOutput: labCase.idealOutput,
			output,
		}),
	};
}

type MembershipMiss = "split" | "merged" | "crossed";

/**
 * How a WrongSegments unit missed its gold Segment set, over scored
 * Segments: `split` into several returned units each inside it, `merged`
 * into one returned unit that holds it and more, or `crossed` otherwise.
 */
function membershipMiss(
	labCase: LabCase,
	check: UnitCheck,
): MembershipMiss | undefined {
	if (check.verdict !== "WrongSegments") return undefined;
	const gold = new Set(check.expected.segments);
	const scored = check.returned.map((unit) =>
		unit.segments.filter(
			(index) => labCase.input.segments[index]?.kind === "ResolvableText",
		),
	);
	if (
		scored.length > 1 &&
		scored.every((segments) => segments.every((index) => gold.has(index)))
	)
		return "split";
	const [only] = scored;
	if (
		scored.length === 1 &&
		only &&
		[...gold].every((index) => only.includes(index))
	)
		return "merged";
	return "crossed";
}

function add(tally: Tally, labCase: LabCase, score: CaseScore): void {
	const { evaluation } = score;
	if (!evaluation) {
		tally.errors++;
		// A failed case counts every scored gold unit as Missing.
		for (const unit of labCase.idealOutput.units) {
			if (isStub(unit)) {
				tally.stub++;
				continue;
			}
			tally.scored++;
			tally.missing++;
			const pieces = unit.segments.length;
			tally.goldPairs += (pieces * (pieces - 1)) / 2;
			if (pieces > 1) tally.multiScored++;
			else tally.singleScored++;
			if (pieces > 1 && !contiguous(labCase, unit))
				tally.discontinuousScored++;
		}
		addHover(tally, labCase, hoverOf(labCase, score));
		tally.contractCases++;
		if (labCase.facts.coverage === "Full") tally.fullCases++;
		return;
	}
	for (const check of evaluation.units) {
		if (check.verdict === "Stub") {
			tally.stub++;
			continue;
		}
		tally.scored++;
		const membership = hasMembership(check);
		if (check.verdict === "Match") tally.match++;
		if (check.verdict === "WrongSegments") {
			tally.wrongSegments++;
			const miss = membershipMiss(labCase, check);
			if (miss) tally[miss]++;
		}
		if (check.verdict === "WrongRoute") {
			tally.wrongRoute++;
			if (check.tolerated) tally.toleratedRoute++;
		}
		if (check.verdict === "Missing") tally.missing++;
		const variants = membership ? check.returned[0]?.variants : undefined;
		if (variants) {
			tally.variantUnits++;
			tally.variantRoutes += variants.length;
		}
		if (check.expected.segments.length > 1) {
			tally.multiScored++;
			if (membership) tally.multiMembership++;
			if (check.verdict === "Match") tally.multiMatch++;
			if (!contiguous(labCase, check.expected)) {
				tally.discontinuousScored++;
				if (membership) tally.discontinuousMembership++;
			}
		} else {
			tally.singleScored++;
			if (membership) tally.singleMembership++;
			if (check.verdict === "Match") tally.singleMatch++;
		}
	}
	addHover(tally, labCase, evaluation.hover);
	addGrouping(tally, labCase, evaluation.grouping);
	if (evaluation.contractPass !== undefined) {
		tally.contractCases++;
		if (evaluation.contractPass) tally.contractPass++;
	}
	if (evaluation.sentence) {
		tally.fullCases++;
		if (evaluation.sentence.pass && evaluation.contractPass)
			tally.fullPass++;
	}
}

/** A score's B-cubed sums; a failed case scores as an empty answer. */
function hoverOf(labCase: LabCase, score: CaseScore): HoverCheck {
	return (
		score.evaluation?.hover ??
		checkHover({
			segments: labCase.input.segments,
			ideal: labCase.idealOutput.units,
			returned: [],
		})
	);
}

function addHover(tally: Tally, labCase: LabCase, hover: HoverCheck): void {
	tally.hoverSegments += hover.segments;
	tally.hoverPrecisionSum += hover.precision;
	tally.hoverRecallSum += hover.recall;
	tally.hoverHighlighted += hover.highlighted;
	tally.hoverUnasserted += hover.unasserted;
	if (labCase.facts.coverage === "Full") {
		tally.fullHoverSegments += hover.segments;
		tally.fullHoverPrecisionSum += hover.precision;
		tally.fullHoverRecallSum += hover.recall;
	}
	tally.multiHoverSegments += hover.multi.segments;
	tally.multiHoverPrecisionSum += hover.multi.precision;
	tally.multiHoverRecallSum += hover.multi.recall;
}

function addGrouping(
	tally: Tally,
	labCase: LabCase,
	grouping: GroupingCheck,
): void {
	tally.goldPairs += grouping.goldPairs;
	tally.recalledPairs += grouping.recalledPairs;
	tally.decidedPairs += grouping.decidedPairs;
	tally.truePairs += grouping.truePairs;
	if (labCase.facts.coverage === "Full") {
		tally.fullPairs += grouping.decidedPairs;
		tally.fullTruePairs += grouping.truePairs;
	}
	tally.overMerged += grouping.overMerged.length;
	tally.underMerged += grouping.underMerged.length;
}

const ratio = (a: number, b: number) => (b === 0 ? Number.NaN : a / b);

const harmonic = (a: number, b: number) =>
	a + b === 0 ? Number.NaN : (2 * a * b) / (a + b);

/** Unresolved and Foreign gold units, which the evaluator does not score. */
export const isStub = (unit: Unit) =>
	unit.route === "Unresolved" || unit.route.family === "Foreign";

/**
 * Rates over scored gold units, summed over repetitions. `membership` is
 * the headline (ADR 0008); `tolerantUnitAccuracy` adds an acceptable route
 * (the same, a tolerated confusion, or the gold route among a borderline
 * unit's variants); `unitAccuracy` is the strict match, kept for
 * comparison. The route rates read only units whose membership holds, and
 * so do `variantRate` (how many of them carry variants) and
 * `meanVariants` (how many routes those carry).
 *
 * Hover (#701), the headline beside membership: B-cubed precision, recall
 * and F1 over the Segments of scored gold units on every record
 * (`hoverPrecision`, `hoverRecall`, `hoverF1`), on Full records only
 * (`fullHover…`) and over multi-piece gold units only (`multiHover…`). An
 * asserted unit is complete, so a highlighted Segment outside it counts
 * against precision on a Partial record too.
 *
 * Grouping (#701): `pairRecall` over the Segment pairs of scored gold
 * units on every record; `pairPrecision` over returned pairs on Full
 * records only, since a Partial record cannot show two unannotated Segments
 * wrongly joined; `pairF1` of the two. `assertedPairPrecision` reads every
 * record's returned pairs that touch an asserted unit, which a Partial
 * record does decide, and `assertedPairF1` pairs it with the same recall.
 */
function rates(tally: Tally) {
	const membership = tally.match + tally.wrongRoute;
	const pairRecall = ratio(tally.recalledPairs, tally.goldPairs);
	const pairPrecision = ratio(tally.fullTruePairs, tally.fullPairs);
	const assertedPairPrecision = ratio(tally.truePairs, tally.decidedPairs);
	const hover = hoverRates({
		segments: tally.hoverSegments,
		precision: tally.hoverPrecisionSum,
		recall: tally.hoverRecallSum,
	});
	const fullHover = hoverRates({
		segments: tally.fullHoverSegments,
		precision: tally.fullHoverPrecisionSum,
		recall: tally.fullHoverRecallSum,
	});
	const multiHover = hoverRates({
		segments: tally.multiHoverSegments,
		precision: tally.multiHoverPrecisionSum,
		recall: tally.multiHoverRecallSum,
	});
	return {
		membership: ratio(membership, tally.scored),
		hoverPrecision: hover.precision,
		hoverRecall: hover.recall,
		hoverF1: hover.f1,
		fullHoverPrecision: fullHover.precision,
		fullHoverRecall: fullHover.recall,
		fullHoverF1: fullHover.f1,
		multiHoverPrecision: multiHover.precision,
		multiHoverRecall: multiHover.recall,
		multiHoverF1: multiHover.f1,
		multiMembership: ratio(tally.multiMembership, tally.multiScored),
		singleMembership: ratio(tally.singleMembership, tally.singleScored),
		discontinuousMembership: ratio(
			tally.discontinuousMembership,
			tally.discontinuousScored,
		),
		pairRecall,
		pairPrecision,
		pairF1: harmonic(pairPrecision, pairRecall),
		assertedPairPrecision,
		assertedPairF1: harmonic(assertedPairPrecision, pairRecall),
		tolerantUnitAccuracy: ratio(
			tally.match + tally.toleratedRoute,
			tally.scored,
		),
		tolerantRouteGivenMembership: ratio(
			tally.match + tally.toleratedRoute,
			membership,
		),
		unitAccuracy: ratio(tally.match, tally.scored),
		routeGivenMembership: ratio(tally.match, membership),
		variantRate: ratio(tally.variantUnits, membership),
		meanVariants: ratio(tally.variantRoutes, tally.variantUnits),
		multiUnitAccuracy: ratio(tally.multiMatch, tally.multiScored),
		singleUnitAccuracy: ratio(tally.singleMatch, tally.singleScored),
		casePass: ratio(tally.contractPass, tally.contractCases),
		fullPass: ratio(tally.fullPass, tally.fullCases),
	};
}

const quantile = (values: readonly number[], q: number) => {
	if (values.length === 0) return Number.NaN;
	const sorted = [...values].sort((a, b) => a - b);
	return (
		sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ??
		Number.NaN
	);
};

/** Latency as the judge sees it: stages run in sequence, a stage's chunks in parallel. */
function modeledLatency(calls: readonly CallRecord[]): number {
	const stages = new Map<string, number>();
	for (const call of calls)
		stages.set(
			call.stage,
			Math.max(stages.get(call.stage) ?? 0, call.latencyMs),
		);
	return [...stages.values()].reduce((total, ms) => total + ms, 0);
}

export type PolicySummary = {
	readonly policy: string;
	readonly cases: number;
	readonly repetitions: number;
	/** Summed over repetitions. */
	readonly tally: Tally;
	readonly rates: ReturnType<typeof rates>;
	/** Membership of each repetition. */
	readonly membershipByRepetition: readonly number[];
	/** Strict unit accuracy of each repetition. */
	readonly unitAccuracyByRepetition: readonly number[];
	/**
	 * The records each hover rate is counted over: those with a scored gold
	 * unit, the Full ones among them, and those with a multi-piece one. The
	 * hovered Segments themselves are summed over repetitions in the tally.
	 */
	readonly hoverRecords: {
		readonly all: number;
		readonly full: number;
		readonly multi: number;
	};
	/**
	 * The records each pair rate is counted over: those with a gold pair,
	 * the Full ones with a returned pair, and those with a returned pair the
	 * gold decides. The pairs themselves are summed over repetitions in the
	 * tally.
	 */
	readonly pairRecords: {
		readonly recall: number;
		readonly fullPrecision: number;
		readonly assertedPrecision: number;
	};
	/** Over-merged returned units and under-merged gold units of each repetition. */
	readonly overMergedByRepetition: readonly number[];
	readonly underMergedByRepetition: readonly number[];
	/**
	 * Consistency: scored gold units whose membership holds in some
	 * repetitions and not others, of those with more than one repetition.
	 */
	readonly membershipFlips: number;
	readonly membershipFlipBase: number;
	/** Cases whose contract verdict (membership) differs between repetitions. */
	readonly flips: number;
	readonly flipBase: number;
	readonly varyingOutputs: number;
};

export type CostSummary = {
	readonly jevInputTokensPerSentence: number;
	readonly jevCallsPerSentence: number;
	readonly jevQuestionsPerSentence: number;
	readonly lunaCallsPerSentence: number;
	readonly lunaInputTokensPerSentence: number;
	readonly lunaOutputTokensPerSentence: number;
	readonly latencyP50: number;
	readonly latencyP95: number;
	readonly errors: number;
};

export function policiesOf(run: LabRun): string[] {
	const names = new Set<string>();
	for (const labCase of run.cases)
		for (const repetition of labCase.repetitions)
			for (const name of Object.keys(repetition.outputs ?? {}))
				names.add(name);
	return [...names];
}

export function primaryOf(run: LabRun): string {
	for (const labCase of run.cases)
		for (const repetition of labCase.repetitions)
			if (repetition.primary) return repetition.primary;
	return policiesOf(run)[0] ?? "";
}

export function summarizePolicy(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
	policy: string,
	only?: ReadonlySet<string>,
): PolicySummary {
	const tally = emptyTally();
	const byRepetition = Array.from({ length: run.repetitions }, emptyTally);
	let flips = 0;
	let flipBase = 0;
	let membershipFlips = 0;
	let membershipFlipBase = 0;
	let varyingOutputs = 0;
	let counted = 0;
	const hoverRecords = { all: 0, full: 0, multi: 0 };
	const pairRecords = {
		recall: 0,
		fullPrecision: 0,
		assertedPrecision: 0,
	};
	for (const caseRun of run.cases) {
		if (only && !only.has(caseRun.id)) continue;
		const labCase = cases.get(caseRun.id);
		if (!labCase) continue;
		counted++;
		const passes: boolean[] = [];
		const outputs = new Set<string>();
		const unitMembership = labCase.idealOutput.units.map(
			(): boolean[] => [],
		);
		let decidedPairs = false;
		let hover: HoverCheck | undefined;
		for (const [index, repetition] of caseRun.repetitions.entries()) {
			const score = scoreCase(labCase, repetition, policy);
			add(tally, labCase, score);
			hover = hoverOf(labCase, score);
			if ((score.evaluation?.grouping.decidedPairs ?? 0) > 0)
				decidedPairs = true;
			labCase.idealOutput.units.forEach((unit, unitIndex) => {
				if (isStub(unit)) return;
				const check = score.evaluation?.units[unitIndex];
				unitMembership[unitIndex]?.push(
					check ? hasMembership(check) : false,
				);
			});
			const repetitionTally = byRepetition[index];
			if (repetitionTally) add(repetitionTally, labCase, score);
			outputs.add(canonicalJson(repetition.outputs?.[policy] ?? null));
			const pass = score.evaluation?.contractPass;
			if (pass !== undefined || score.error) passes.push(pass ?? false);
		}
		if (passes.length > 1) {
			flipBase++;
			if (passes.some(Boolean) && passes.some((pass) => !pass)) flips++;
		}
		for (const held of unitMembership) {
			if (held.length < 2) continue;
			membershipFlipBase++;
			if (held.some(Boolean) && held.some((entry) => !entry))
				membershipFlips++;
		}
		if (outputs.size > 1) varyingOutputs++;
		// The hovered Segments come from the gold, the same every repetition.
		if (hover && hover.segments > 0) {
			hoverRecords.all++;
			if (labCase.facts.coverage === "Full") hoverRecords.full++;
		}
		if (hover && hover.multi.segments > 0) hoverRecords.multi++;
		if (
			labCase.idealOutput.units.some(
				(unit) => !isStub(unit) && unit.segments.length > 1,
			)
		)
			pairRecords.recall++;
		if (decidedPairs) {
			pairRecords.assertedPrecision++;
			if (labCase.facts.coverage === "Full") pairRecords.fullPrecision++;
		}
	}
	return {
		policy,
		cases: counted,
		repetitions: run.repetitions,
		tally,
		rates: rates(tally),
		membershipByRepetition: byRepetition.map(
			(entry) => rates(entry).membership,
		),
		unitAccuracyByRepetition: byRepetition.map(
			(entry) => rates(entry).unitAccuracy,
		),
		hoverRecords,
		pairRecords,
		overMergedByRepetition: byRepetition.map((entry) => entry.overMerged),
		underMergedByRepetition: byRepetition.map((entry) => entry.underMerged),
		membershipFlips,
		membershipFlipBase,
		flips,
		flipBase,
		varyingOutputs,
	};
}

/** One over- or under-merge of a run, with the repetitions that made it. */
export type GroupingExample = {
	readonly case: string;
	readonly sentence: string;
	/** `over`: a returned unit joining Segments of several gold units; `under`: a gold unit split. */
	readonly kind: "over" | "under";
	/** The returned unit's Segments for `over`, the gold unit's for `under`. */
	readonly text: string;
	/** The split gold unit's route, for `under`. */
	readonly gold?: string;
	/**
	 * `over`: its Segments by gold unit, each with that unit's route, none
	 * for Segments no gold unit asserts; `under`: the gold unit's Segments
	 * by returned unit.
	 */
	readonly parts: readonly {
		readonly text: string;
		readonly gold?: string;
	}[];
	readonly repetitions: readonly number[];
};

/**
 * Every over- and under-merge of one policy, in case order, each listed
 * once with the repetitions that made it, so failures read as text.
 */
export function groupingExamples(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
	policy: string,
	only?: ReadonlySet<string>,
): GroupingExample[] {
	const examples = new Map<
		string,
		{ example: Omit<GroupingExample, "repetitions">; repetitions: number[] }
	>();
	for (const caseRun of run.cases) {
		if (only && !only.has(caseRun.id)) continue;
		const labCase = cases.get(caseRun.id);
		if (!labCase) continue;
		const sentence = labCase.input.segments
			.map(({ text }) => text)
			.join("");
		const goldOf = (unit: number | undefined) => {
			const entry =
				unit === undefined
					? undefined
					: labCase.idealOutput.units[unit];
			return entry ? { gold: keyOf(entry.route) } : {};
		};
		for (const [index, repetition] of caseRun.repetitions.entries()) {
			const grouping = scoreCase(labCase, repetition, policy).evaluation
				?.grouping;
			if (!grouping) continue;
			// Two like units of one Sentence stay two examples: the key holds their Segments.
			const found: {
				where: unknown;
				example: Omit<GroupingExample, "repetitions">;
			}[] = [
				...grouping.overMerged.map((merge) => ({
					where: merge.segments,
					example: {
						case: caseRun.id,
						sentence,
						kind: "over" as const,
						text: merge.text,
						parts: merge.parts.map((part) => ({
							text: part.text,
							...goldOf(part.unit),
						})),
					},
				})),
				...grouping.underMerged.map((split) => ({
					where: split.unit,
					example: {
						case: caseRun.id,
						sentence,
						kind: "under" as const,
						text: split.text,
						...goldOf(split.unit),
						parts: split.fragments.map((text) => ({ text })),
					},
				})),
			];
			for (const { where, example } of found) {
				const key = canonicalJson({ where, example });
				const entry = examples.get(key) ?? { example, repetitions: [] };
				entry.repetitions.push(index);
				examples.set(key, entry);
			}
		}
	}
	return [...examples.values()].map(({ example, repetitions }) => ({
		...example,
		repetitions,
	}));
}

export function summarizeCost(
	run: LabRun,
	only?: ReadonlySet<string>,
): CostSummary {
	const perSentence: {
		jev: CallRecord[];
		luna: CallRecord[];
		latency: number;
	}[] = [];
	let errors = 0;
	for (const caseRun of run.cases) {
		if (only && !only.has(caseRun.id)) continue;
		for (const repetition of caseRun.repetitions) {
			if (repetition.error) errors++;
			perSentence.push({
				jev: repetition.calls.filter((call) => call.executor === "jev"),
				luna: repetition.calls.filter(
					(call) => call.executor === "luna",
				),
				latency: modeledLatency(repetition.calls),
			});
		}
	}
	const mean = (pick: (entry: (typeof perSentence)[number]) => number) =>
		perSentence.reduce((total, entry) => total + pick(entry), 0) /
		Math.max(1, perSentence.length);
	const sum = (
		calls: readonly CallRecord[],
		key: "inputTokens" | "outputTokens" | "questions",
	) => calls.reduce((total, call) => total + call[key], 0);
	return {
		jevInputTokensPerSentence: mean((entry) =>
			sum(entry.jev, "inputTokens"),
		),
		jevCallsPerSentence: mean((entry) => entry.jev.length),
		jevQuestionsPerSentence: mean((entry) => sum(entry.jev, "questions")),
		lunaCallsPerSentence: mean((entry) => entry.luna.length),
		lunaInputTokensPerSentence: mean((entry) =>
			sum(entry.luna, "inputTokens"),
		),
		lunaOutputTokensPerSentence: mean((entry) =>
			sum(entry.luna, "outputTokens"),
		),
		latencyP50: quantile(
			perSentence.map((entry) => entry.latency),
			0.5,
		),
		latencyP95: quantile(
			perSentence.map((entry) => entry.latency),
			0.95,
		),
		errors,
	};
}

/** Per key: scored gold units, their membership, tolerant and strict matches. */
export type Breakdown = Record<
	string,
	{ scored: number; membership: number; tolerant: number; match: number }
>;

/**
 * Per gold unit, keyed by what `keysOf` names it: its route, its size, the
 * Rules its record cites.
 */
export function breakdown(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
	policy: string,
	keysOf: (labCase: LabCase, unit: Unit) => readonly string[],
	only?: ReadonlySet<string>,
): Breakdown {
	const result: Breakdown = {};
	for (const caseRun of run.cases) {
		if (only && !only.has(caseRun.id)) continue;
		const labCase = cases.get(caseRun.id);
		if (!labCase) continue;
		for (const repetition of caseRun.repetitions) {
			const { evaluation } = scoreCase(labCase, repetition, policy);
			labCase.idealOutput.units.forEach((unit, index) => {
				const check = evaluation?.units[index];
				if (evaluation && check?.verdict === "Stub") return;
				if (!evaluation && isStub(unit)) return;
				for (const key of keysOf(labCase, unit)) {
					const entry = result[key] ?? {
						scored: 0,
						membership: 0,
						tolerant: 0,
						match: 0,
					};
					result[key] = entry;
					entry.scored++;
					if (check && hasMembership(check)) entry.membership++;
					if (check && tolerantMatch(check)) entry.tolerant++;
					if (check?.verdict === "Match") entry.match++;
				}
			});
		}
	}
	return result;
}

export const byGoldRoute = (_: LabCase, unit: Unit) => [keyOf(unit.route)];
export const byRule = (labCase: LabCase) =>
	labCase.rules.length > 0 ? labCase.rules : ["(no Rule cited)"];

/** Segment indices of a gold unit are contiguous when only non-words lie between. */
export function contiguous(labCase: LabCase, unit: Unit): boolean {
	const sorted = [...unit.segments].sort((a, b) => a - b);
	const first = sorted[0] ?? 0;
	const last = sorted[sorted.length - 1] ?? 0;
	for (let index = first; index <= last; index++)
		if (
			labCase.input.segments[index]?.kind === "ResolvableText" &&
			!sorted.includes(index)
		)
			return false;
	return true;
}

export const byShape = (labCase: LabCase, unit: Unit) =>
	unit.segments.length === 1
		? ["one piece"]
		: contiguous(labCase, unit)
			? ["contiguous"]
			: ["discontinuous"];

export type Calibration = {
	readonly bins: readonly {
		from: number;
		to: number;
		count: number;
		correct: number;
	}[];
	/** At each floor, the share of judgments kept and the accuracy among them. */
	readonly riskCoverage: readonly {
		floor: number;
		kept: number;
		accuracy: number;
	}[];
};

function calibrate(
	points: readonly { value: number; correct: boolean }[],
): Calibration {
	const edges = [0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0001];
	const bins = edges.slice(0, -1).map((from, index) => {
		const to = edges[index + 1] ?? 1;
		const inside = points.filter(
			(point) => point.value >= from && point.value < to,
		);
		return {
			from,
			to: Math.min(1, to),
			count: inside.length,
			correct: inside.filter((point) => point.correct).length,
		};
	});
	const riskCoverage = [0, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95].map(
		(floor) => {
			const kept = points.filter((point) => point.value >= floor);
			return {
				floor,
				kept: ratio(kept.length, points.length),
				accuracy: ratio(
					kept.filter((point) => point.correct).length,
					kept.length,
				),
			};
		},
	);
	return { bins, riskCoverage };
}

/**
 * Route calibration: each route judgment whose group is exactly a scored gold
 * unit, its confidence against whether the route is right. Membership
 * calibration: each link whose truth the gold decides (both pieces in one
 * gold unit, or one piece in a gold unit and the other outside it).
 */
export function calibration(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
	only?: ReadonlySet<string>,
): {
	routes: Calibration;
	routeShare: Calibration;
	links: Calibration;
	linkCount: number;
} {
	const routePoints: { value: number; correct: boolean }[] = [];
	const sharePoints: { value: number; correct: boolean }[] = [];
	const linkPoints: { value: number; correct: boolean }[] = [];
	for (const caseRun of run.cases) {
		if (only && !only.has(caseRun.id)) continue;
		const labCase = cases.get(caseRun.id);
		if (!labCase) continue;
		const pieceSegments = labCase.input.segments.flatMap(
			(segment, index) =>
				segment.kind === "ResolvableText" ? [index] : [],
		);
		const segmentOf = (id: number) => pieceSegments[id - 1] ?? -1;
		const scoredGold = labCase.idealOutput.units.filter(
			(unit) =>
				unit.route !== "Unresolved" && unit.route.family !== "Foreign",
		);
		const goldUnitOf = new Map<number, number>();
		labCase.idealOutput.units.forEach((unit, index) => {
			for (const segment of unit.segments) goldUnitOf.set(segment, index);
		});
		for (const repetition of caseRun.repetitions) {
			for (const judged of repetition.routes ?? []) {
				const segments = judged.group.map(segmentOf);
				const gold = scoredGold.find(
					(unit) =>
						unit.segments.length === segments.length &&
						unit.segments.every((segment) =>
							segments.includes(segment),
						),
				);
				if (!gold) continue;
				const correct = keyOf(gold.route) === judged.choice;
				routePoints.push({ value: judged.confidence, correct });
				sharePoints.push({ value: judged.share, correct });
			}
			for (const link of repetition.links ?? []) {
				const left = goldUnitOf.get(segmentOf(link.left));
				const right = goldUnitOf.get(segmentOf(link.right));
				if (left === undefined && right === undefined) continue;
				if (
					(left === undefined || right === undefined) &&
					labCase.facts.coverage !== "Full"
				) {
					// One piece outside every gold unit of a Partial record: a
					// negative only when the other piece's unit is known.
					linkPoints.push({
						value: link.probability,
						correct: false,
					});
					continue;
				}
				linkPoints.push({
					value: link.probability,
					correct: left === right,
				});
			}
		}
	}
	// For links, "correct" means "truly linked"; calibrate probability against it.
	return {
		routes: calibrate(routePoints),
		routeShare: calibrate(sharePoints),
		links: calibrate(linkPoints),
		linkCount: linkPoints.length,
	};
}

export type Confusion = {
	readonly count: number;
	/**
	 * The ADR 0008 Kind pair it confuses, as `PART/ADV`, or `variants` when
	 * the gold route is among a borderline unit's variants; absent when it
	 * stays an error.
	 */
	readonly tolerated?: string;
};

/**
 * Route confusions over units whose membership holds, keyed gold →
 * returned (a borderline unit's variants joined by `|`), each marked with
 * what makes it acceptable.
 */
export function confusions(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
	policy: string,
	only?: ReadonlySet<string>,
): Map<string, Confusion> {
	const counts = new Map<string, Confusion>();
	for (const caseRun of run.cases) {
		if (only && !only.has(caseRun.id)) continue;
		const labCase = cases.get(caseRun.id);
		if (!labCase) continue;
		for (const repetition of caseRun.repetitions) {
			const { evaluation } = scoreCase(labCase, repetition, policy);
			for (const check of evaluation?.units ?? []) {
				if (check.verdict !== "WrongRoute") continue;
				const [returned] = check.returned;
				if (!returned) continue;
				const key = `${keyOf(check.expected.route)} → ${
					returned.variants
						? returned.variants.map(keyOf).join("|")
						: keyOf(returned.route)
				}`;
				const pair = returned.variants
					? undefined
					: toleratedPairOf(check.expected.route, returned.route);
				const tolerated = returned.variants
					? check.tolerated
						? "variants"
						: undefined
					: pair?.join("/");
				counts.set(key, {
					count: (counts.get(key)?.count ?? 0) + 1,
					...(tolerated ? { tolerated } : {}),
				});
			}
		}
	}
	return counts;
}

const lassenForms = new Set([
	"lassen",
	"lasse",
	"lässt",
	"läßt",
	"lasst",
	"laßt",
	"ließ",
	"ließen",
	"ließest",
	"ließt",
	"gelassen",
	"ließe",
]);

/**
 * Phenomenon tags of a gold unit, from its route and its pieces' spellings:
 * what kind of grouping or routing it asks for.
 */
export const byPhenomenon = (labCase: LabCase, unit: Unit): string[] => {
	const route = keyOf(unit.route);
	const texts = unit.segments.map(
		(index) => labCase.input.segments[index]?.text.toLowerCase() ?? "",
	);
	const surfaces = unit.segments.map((index) =>
		(
			labCase.input.segments[index]?.surface ??
			labCase.input.segments[index]?.text ??
			""
		).toLowerCase(),
	);
	const tags: string[] = [];
	const sorted = [...unit.segments].sort((a, b) => a - b);
	const pieceIndex = (segment: number) =>
		labCase.input.segments
			.slice(0, segment)
			.filter((entry) => entry.kind === "ResolvableText").length;
	const span =
		sorted.length > 1
			? pieceIndex(sorted[sorted.length - 1] ?? 0) -
				pieceIndex(sorted[0] ?? 0)
			: 0;
	if (unit.segments.length === 1) tags.push(`one piece ${route}`);
	if (route === "Lexeme/VERB" && unit.segments.length > 1) {
		const discontinuous = !contiguous(labCase, unit);
		if (texts.slice(1).some((text) => particleForms.has(text)))
			tags.push(
				discontinuous
					? span >= 5
						? "particle verb, split ≥5 pieces"
						: "particle verb, split <5 pieces"
					: "particle verb, adjacent",
			);
		if (texts.some((text) => authoredInventory.isAuxiliary(text)))
			tags.push("VERB with auxiliary");
		if (texts.some((text) => reflexiveForms.has(text)))
			tags.push("VERB with reflexive");
		if (texts.some((text) => expletiveForms.has(text)))
			tags.push("VERB with expletive es");
		if (texts.some((text) => lassenForms.has(text)))
			tags.push("causative lassen");
	}
	if (
		unit.segments.length > 1 &&
		/^Lexeme\/(VERB|ADJ|NOUN)$/u.test(route) &&
		surfaces.some((surface) => authoredInventory.isAdposition(surface))
	)
		tags.push(`governed preposition (${route.slice(7)})`);
	if (/^Lexeme\/(NOUN|PROPN)$/u.test(route) && unit.segments.length > 1)
		tags.push(`${route.slice(7)} with article or parts`);
	if (
		unit.segments.some(
			(index) => labCase.input.segments[index]?.surface !== undefined,
		)
	)
		tags.push("contains a fused piece");
	if (unit.route !== "Unresolved" && unit.route.family !== "Lexeme")
		tags.push(route);
	if (
		route === "Lexeme/ADJ" &&
		unit.segments.length === 1 &&
		/^ge.+(t|en)$/u.test(texts[0] ?? "")
	)
		tags.push("participle-shaped ADJ");
	return tags;
};

/**
 * The round-2 buckets of a gold unit: one piece, multi-piece Lexeme,
 * contiguous or discontinuous Locution, Saying.
 */
export function bucketOf(labCase: LabCase, unit: Unit): string {
	if (unit.segments.length === 1) return "one piece";
	if (unit.route === "Unresolved") return "Unresolved";
	if (unit.route.family === "Saying") return "Saying";
	if (unit.route.family === "Locution")
		return contiguous(labCase, unit)
			? "Locution contiguous"
			: "Locution discontinuous";
	return `${unit.route.family} multi-piece`;
}

/** Exact two-sided McNemar p for b and c discordant pairs. */
export function mcnemar(b: number, c: number): number {
	const n = b + c;
	if (n === 0) return 1;
	const k = Math.min(b, c);
	let tail = 0;
	let term = 0.5 ** n;
	for (let i = 0; i <= k; i++) {
		tail += term;
		term = (term * (n - i)) / (i + 1);
	}
	return Math.min(1, 2 * tail);
}
