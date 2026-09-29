/**
 * Scores a stored lab run with the harness evaluator (#731) and summarizes
 * it per assembly policy: unit verdicts, segment and route accuracy (all,
 * one-piece and multi-piece gold units), Full-record sentence passes, flips
 * between repetitions, cost and latency, plus breakdowns by gold route and
 * cited Rule and the calibration of route and membership judgments.
 */
import { stableJson } from "promptsmith";
import type { Unit } from "../../evaluation/spec-corpus/segment-in-units.js";
import {
	evaluateSegmentInUnits,
	type SegmentInUnitsEvaluation,
} from "../../evaluation/spec-corpus/segment-in-units-evaluation.js";
import { keyOf } from "../de/routes.js";
import type { LabCase } from "./corpus.js";
import type { CallRecord } from "./jev.js";
import { jevUsdPerToken } from "./ledger.js";
import type { LabRun, RepetitionRecord } from "./run.js";

export type Tally = {
	scored: number;
	match: number;
	wrongSegments: number;
	wrongRoute: number;
	missing: number;
	stub: number;
	multiScored: number;
	multiSegments: number;
	multiMatch: number;
	singleScored: number;
	singleSegments: number;
	singleMatch: number;
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
	missing: 0,
	stub: 0,
	multiScored: 0,
	multiSegments: 0,
	multiMatch: 0,
	singleScored: 0,
	singleSegments: 0,
	singleMatch: 0,
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

function add(tally: Tally, labCase: LabCase, score: CaseScore): void {
	const { evaluation } = score;
	if (!evaluation) {
		tally.errors++;
		// A failed case counts every scored gold unit as Missing.
		for (const unit of labCase.idealOutput.units) {
			const stub =
				unit.route === "Unresolved" || unit.route.family === "Foreign";
			if (stub) {
				tally.stub++;
				continue;
			}
			tally.scored++;
			tally.missing++;
			if (unit.segments.length > 1) tally.multiScored++;
			else tally.singleScored++;
		}
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
		const segmentsOk =
			check.verdict === "Match" || check.verdict === "WrongRoute";
		if (check.verdict === "Match") tally.match++;
		if (check.verdict === "WrongSegments") tally.wrongSegments++;
		if (check.verdict === "WrongRoute") tally.wrongRoute++;
		if (check.verdict === "Missing") tally.missing++;
		if (check.expected.segments.length > 1) {
			tally.multiScored++;
			if (segmentsOk) tally.multiSegments++;
			if (check.verdict === "Match") tally.multiMatch++;
		} else {
			tally.singleScored++;
			if (segmentsOk) tally.singleSegments++;
			if (check.verdict === "Match") tally.singleMatch++;
		}
	}
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

const ratio = (a: number, b: number) => (b === 0 ? Number.NaN : a / b);

export function rates(tally: Tally) {
	return {
		unitAccuracy: ratio(tally.match, tally.scored),
		segmentAccuracy: ratio(tally.match + tally.wrongRoute, tally.scored),
		routeGivenSegments: ratio(tally.match, tally.match + tally.wrongRoute),
		multiSegmentAccuracy: ratio(tally.multiSegments, tally.multiScored),
		multiUnitAccuracy: ratio(tally.multiMatch, tally.multiScored),
		singleSegmentAccuracy: ratio(tally.singleSegments, tally.singleScored),
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
export function modeledLatency(calls: readonly CallRecord[]): number {
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
	/** Unit accuracy of each repetition. */
	readonly unitAccuracyByRepetition: readonly number[];
	readonly flips: number;
	readonly flipBase: number;
	readonly varyingOutputs: number;
};

export type CostSummary = {
	readonly jevInputTokensPerSentence: number;
	readonly usdPerSentence: number;
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
	let varyingOutputs = 0;
	let counted = 0;
	for (const caseRun of run.cases) {
		if (only && !only.has(caseRun.id)) continue;
		const labCase = cases.get(caseRun.id);
		if (!labCase) continue;
		counted++;
		const passes: boolean[] = [];
		const outputs = new Set<string>();
		for (const [index, repetition] of caseRun.repetitions.entries()) {
			const score = scoreCase(labCase, repetition, policy);
			add(tally, labCase, score);
			const repetitionTally = byRepetition[index];
			if (repetitionTally) add(repetitionTally, labCase, score);
			outputs.add(stableJson(repetition.outputs?.[policy] ?? null));
			const pass = score.evaluation?.contractPass;
			if (pass !== undefined || score.error) passes.push(pass ?? false);
		}
		if (passes.length > 1) {
			flipBase++;
			if (passes.some(Boolean) && passes.some((pass) => !pass)) flips++;
		}
		if (outputs.size > 1) varyingOutputs++;
	}
	return {
		policy,
		cases: counted,
		repetitions: run.repetitions,
		tally,
		rates: rates(tally),
		unitAccuracyByRepetition: byRepetition.map(
			(entry) => rates(entry).unitAccuracy,
		),
		flips,
		flipBase,
		varyingOutputs,
	};
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
	const jevInputTokensPerSentence = mean((entry) =>
		sum(entry.jev, "inputTokens"),
	);
	return {
		jevInputTokensPerSentence,
		usdPerSentence: jevInputTokensPerSentence * jevUsdPerToken,
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

export type Breakdown = Record<
	string,
	{ scored: number; segments: number; match: number }
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
				if (
					!evaluation &&
					(unit.route === "Unresolved" ||
						unit.route.family === "Foreign")
				)
					return;
				for (const key of keysOf(labCase, unit)) {
					const entry = result[key] ?? {
						scored: 0,
						segments: 0,
						match: 0,
					};
					result[key] = entry;
					entry.scored++;
					if (
						check?.verdict === "Match" ||
						check?.verdict === "WrongRoute"
					)
						entry.segments++;
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
export const bySize = (_: LabCase, unit: Unit) => {
	const size = unit.segments.length;
	return [size === 1 ? "1 piece" : size === 2 ? "2 pieces" : "3+ pieces"];
};

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

/** Per case, the primary verdict of each gold unit in repetition 0, for diffs. */
export function unitVerdicts(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
	policy: string,
): Map<string, readonly string[]> {
	const result = new Map<string, readonly string[]>();
	for (const caseRun of run.cases) {
		const labCase = cases.get(caseRun.id);
		const repetition = caseRun.repetitions[0];
		if (!labCase || !repetition) continue;
		const { evaluation } = scoreCase(labCase, repetition, policy);
		result.set(
			caseRun.id,
			labCase.idealOutput.units.map(
				(_, index) => evaluation?.units[index]?.verdict ?? "Missing",
			),
		);
	}
	return result;
}

/** Route confusions over units whose segments matched: gold → returned. */
export function confusions(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
	policy: string,
	only?: ReadonlySet<string>,
): Map<string, number> {
	const counts = new Map<string, number>();
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
				const key = `${keyOf(check.expected.route)} → ${keyOf(returned.route)}`;
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}
	}
	return counts;
}

/**
 * Paired comparison per gold unit: its majority verdict over repetitions on
 * each side. Counts units only one side matches, for a McNemar-style read.
 */
export function pairedUnits(
	left: { run: LabRun; policy: string },
	right: { run: LabRun; policy: string },
	cases: ReadonlyMap<string, LabCase>,
	only?: ReadonlySet<string>,
): {
	both: number;
	neither: number;
	leftOnly: { id: string; text: string }[];
	rightOnly: { id: string; text: string }[];
} {
	const majority = (run: LabRun, policy: string) => {
		const result = new Map<string, boolean>();
		for (const caseRun of run.cases) {
			if (only && !only.has(caseRun.id)) continue;
			const labCase = cases.get(caseRun.id);
			if (!labCase) continue;
			const votes = new Map<number, number>();
			for (const repetition of caseRun.repetitions) {
				const { evaluation } = scoreCase(labCase, repetition, policy);
				labCase.idealOutput.units.forEach((_, index) => {
					if (evaluation?.units[index]?.verdict === "Match")
						votes.set(index, (votes.get(index) ?? 0) + 1);
				});
			}
			labCase.idealOutput.units.forEach((unit, index) => {
				if (
					unit.route === "Unresolved" ||
					unit.route.family === "Foreign"
				)
					return;
				result.set(
					`${caseRun.id}#${index}`,
					(votes.get(index) ?? 0) * 2 > caseRun.repetitions.length,
				);
			});
		}
		return result;
	};
	const a = majority(left.run, left.policy);
	const b = majority(right.run, right.policy);
	const summary = {
		both: 0,
		neither: 0,
		leftOnly: [] as { id: string; text: string }[],
		rightOnly: [] as { id: string; text: string }[],
	};
	for (const [key, leftMatch] of a) {
		const rightMatch = b.get(key);
		if (rightMatch === undefined) continue;
		const [id = "", index = "0"] = key.split("#");
		const labCase = cases.get(id);
		const unit = labCase?.idealOutput.units[Number(index)];
		const text = `${unit?.segments.map((segment) => labCase?.input.segments[segment]?.text).join(" ")} ${unit ? keyOf(unit.route) : ""}`;
		if (leftMatch && rightMatch) summary.both++;
		else if (!leftMatch && !rightMatch) summary.neither++;
		else if (leftMatch) summary.leftOnly.push({ id, text });
		else summary.rightOnly.push({ id, text });
	}
	return summary;
}
