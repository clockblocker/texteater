/**
 * Sentence-level view of the target-classification corpus, plus the scoring
 * every intake experiment shares.
 *
 * Production and P1 answer one click. These experiments answer a whole
 * sentence once, so the corpus is regrouped by sentence text and the gold
 * click cases become probes into the sentence analysis: for every gold click,
 * look up the unit the analysis assigned to that occurrence and compare it to
 * `idealOutput`. Occurrences without a gold case still carry unsupervised
 * signal (resolution coverage, route inventory, partition self-consistency),
 * which is reported alongside.
 */

import {
	demonstrationIds,
	evaluationCaseIds,
	targetCases,
} from "../../src/concrete-lang/de/target-classification/cases.js";
import type { Call } from "../harness.js";
import { stable } from "../harness.js";

const data = { cases: targetCases, demonstrationIds };

export type Segment = { readonly kind: string; readonly text: string };

export type ClickCase = {
	readonly id: string;
	readonly clickedSegmentIndex: number;
	readonly idealOutput: Record<string, unknown>;
};

export type Sentence = {
	readonly key: string;
	readonly id: string;
	readonly segments: readonly Segment[];
	/** Indices of the ResolvableText segments, in order. */
	readonly resolvable: readonly number[];
	readonly cases: readonly ClickCase[];
};

/** One clickable thing: the group and its Dumling route, or an explicit miss. */
export type Unit =
	| { readonly decision: "Unresolved"; readonly reason?: string }
	| {
			readonly family: string;
			readonly kind: string;
			readonly memberSegmentIndices: readonly number[];
	  };

/** What one design produces for one sentence at intake time. */
export type Analysis = {
	/** Top-level unit containing each resolvable occurrence. */
	readonly units: ReadonlyMap<number, Unit>;
	/** Optional second lattice level: the smaller unit an occurrence heads. */
	readonly sub?: ReadonlyMap<number, Unit>;
	readonly calls: readonly Call[];
	readonly note?: Record<string, unknown>;
};

export const unresolved: Unit = { decision: "Unresolved" };

export function isResolved(
	unit: Unit | undefined,
): unit is Extract<Unit, { family: string }> {
	return !!unit && !("decision" in unit);
}

type RawCase = {
	input: { clickedSegmentIndex: number; segments: Segment[] };
	idealOutput: Record<string, unknown>;
};
const cases = data.cases as Record<string, RawCase>;

/**
 * `eval` is the scored set (evaluation ids minus demonstrations, the same
 * scope P1-P4 report on); `all` adds the authoring cases.
 */
export function loadSentences(scope: string): Sentence[] {
	const ids =
		scope === "all"
			? Object.keys(cases)
			: evaluationCaseIds.filter(
					(id) => !data.demonstrationIds.includes(id),
				);
	const grouped = new Map<string, { id: string; raw: RawCase[] }>();
	for (const id of ids) {
		const raw = cases[id];
		if (!raw) continue;
		const key = raw.input.segments.map((segment) => segment.text).join("");
		const entry = grouped.get(key) ?? { id, raw: [] };
		entry.raw.push({ ...raw, id } as RawCase & { id: string });
		grouped.set(key, entry);
	}
	return [...grouped.entries()].map(([key, entry]) => {
		const segments = entry.raw[0]!.input.segments;
		return {
			key,
			id: entry.id,
			segments,
			resolvable: segments.flatMap((segment, index) =>
				segment.kind === "ResolvableText" ? [index] : [],
			),
			cases: entry.raw.map((raw) => ({
				id: (raw as RawCase & { id: string }).id,
				clickedSegmentIndex: raw.input.clickedSegmentIndex,
				idealOutput: raw.idealOutput,
			})),
		};
	});
}

/** Gold comparison ignores the reason a design gives for a miss. */
function projected(unit: Unit | undefined): unknown {
	if (!unit) return { decision: "Unresolved" };
	if ("decision" in unit) return { decision: "Unresolved" };
	return {
		family: unit.family,
		kind: unit.kind,
		memberSegmentIndices: [...unit.memberSegmentIndices],
	};
}

export type CaseScore = {
	readonly id: string;
	readonly pass: boolean;
	readonly routeCorrect: boolean;
	readonly membersCorrect: boolean;
	/** The gold unit appears somewhere in the lattice, top level or below. */
	readonly inLattice: boolean;
	readonly expected: unknown;
	readonly actual: unknown;
	readonly sub?: unknown;
};

export type Report = ReturnType<typeof report>;

export function report(
	name: string,
	pairs: readonly { sentence: Sentence; analysis: Analysis | null }[],
	extra: Record<string, unknown> = {},
) {
	const scores: CaseScore[] = [];
	const calls: Call[] = [];
	const routes = new Map<string, number>();
	let occurrences = 0;
	let resolvedOccurrences = 0;
	let inconsistent = 0;
	let sentencesFailed = 0;
	const perSentenceMs: number[] = [];

	for (const { sentence, analysis } of pairs) {
		if (!analysis) {
			sentencesFailed += 1;
			for (const probe of sentence.cases)
				scores.push({
					id: probe.id,
					pass: false,
					routeCorrect: false,
					membersCorrect: false,
					inLattice: false,
					expected: probe.idealOutput,
					actual: null,
				});
			continue;
		}
		calls.push(...analysis.calls);
		perSentenceMs.push(
			analysis.calls.reduce((sum, call) => sum + call.durationMs, 0),
		);
		for (const index of sentence.resolvable) {
			occurrences += 1;
			const unit = analysis.units.get(index);
			if (!isResolved(unit)) continue;
			resolvedOccurrences += 1;
			const label = `${unit.family}/${unit.kind}`;
			routes.set(label, (routes.get(label) ?? 0) + 1);
			// A sentence-level design should give every member of a unit the
			// same unit; production cannot, and the corpus criteria demands it.
			for (const member of unit.memberSegmentIndices) {
				if (member === index) continue;
				if (
					stable(projected(analysis.units.get(member))) !==
					stable(projected(unit))
				)
					inconsistent += 1;
			}
			for (const sublabel of analysis.sub
				? [analysis.sub.get(index)]
				: []) {
				if (!isResolved(sublabel)) continue;
				const key = `sub:${sublabel.family}/${sublabel.kind}`;
				routes.set(key, (routes.get(key) ?? 0) + 1);
			}
		}
		for (const probe of sentence.cases) {
			const unit = analysis.units.get(probe.clickedSegmentIndex);
			const sub = analysis.sub?.get(probe.clickedSegmentIndex);
			const actual = projected(unit);
			const expected = probe.idealOutput;
			const golden = expected as {
				family?: string;
				kind?: string;
				memberSegmentIndices?: number[];
			};
			scores.push({
				id: probe.id,
				pass: stable(actual) === stable(expected),
				routeCorrect:
					isResolved(unit) &&
					unit.family === golden.family &&
					unit.kind === golden.kind,
				membersCorrect:
					isResolved(unit) &&
					stable([...unit.memberSegmentIndices]) ===
						stable(golden.memberSegmentIndices ?? null),
				inLattice:
					stable(actual) === stable(expected) ||
					stable(projected(sub)) === stable(expected),
				expected,
				actual,
				...(sub ? { sub: projected(sub) } : {}),
			});
		}
	}

	const sorted = [...perSentenceMs].sort((a, b) => a - b);
	const quantile = (p: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
	const sentences = pairs.length;
	const summary = {
		name,
		sentences,
		sentencesFailed,
		cases: scores.length,
		passed: scores.filter((score) => score.pass).length,
		routeCorrect: scores.filter((score) => score.routeCorrect).length,
		membersCorrect: scores.filter((score) => score.membersCorrect).length,
		inLattice: scores.filter((score) => score.inLattice).length,
		occurrences,
		resolvedOccurrences,
		occurrenceCoverage: +(resolvedOccurrences / (occurrences || 1)).toFixed(
			3,
		),
		inconsistentMemberships: inconsistent,
		callsPerSentence: +(calls.length / (sentences || 1)).toFixed(2),
		questionsPerSentence: +(
			calls.reduce((sum, call) => sum + call.questions, 0) /
			(sentences || 1)
		).toFixed(1),
		inputTokensPerSentence: Math.round(
			calls.reduce((sum, call) => sum + call.input_tokens, 0) /
				(sentences || 1),
		),
		outputTokensPerSentence: Math.round(
			calls.reduce((sum, call) => sum + call.output_tokens, 0) /
				(sentences || 1),
		),
		clickTimeCalls: 0,
		sentenceLatencyMs: {
			p50: Math.round(quantile(0.5)),
			p90: Math.round(quantile(0.9)),
			max: Math.round(sorted.at(-1) ?? 0),
		},
		routeInventory: Object.fromEntries(
			[...routes.entries()].sort((a, b) => b[1] - a[1]),
		),
		...extra,
	};
	return { summary, scores };
}
