/**
 * How a `resolve.grammar` run is scored (#873). Lemma identity is the
 * headline, checked with `lemmaIdentityKey`: Family, Kind, Core Features
 * and the case-folded Canonical Form. Separate lines cover the cell's
 * features, the members, their spelling, and `valencyEvidence`; exact
 * match is reported but is not the headline. A click that came back
 * Unresolved, a Catalog Miss or failed is wrong on every line. Every line
 * reports its count and a 95% Wilson interval, and the cases whose Lemma
 * verdict flips between repetitions are named.
 */

import { canonicalJson } from "common-utils";
import { lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { z } from "zod";

/** What one attempt at a case returned, as a run stores it. */
export const grammarOutputSchema = z.object({
	_tag: z.enum(["Resolved", "Unresolved", "CatalogMiss", "NoMatchingUnit"]),
	attestation: z.unknown().optional(),
	message: z.string().optional(),
	/** Why it came out so, from the operation's trace. */
	reason: z.string().optional(),
});
export type GrammarOutput = z.infer<typeof grammarOutputSchema>;

/** The lines one attempt is scored on, true when the output matches gold there. */
export type GrammarEvaluation = {
	readonly outcome: GrammarOutput["_tag"];
	readonly reason?: string;
	readonly lemma: boolean;
	readonly cell: boolean;
	readonly members: boolean;
	readonly spelling: boolean;
	/** Absent when gold's route records no valencyEvidence. */
	readonly valency?: boolean;
	readonly exact: boolean;
};

type Values = Readonly<Record<string, unknown>>;
type AttestationValue = Values & {
	readonly surface: Values & { readonly lemma: Dumling.Lemma };
	readonly members: readonly unknown[];
};

/** A bag's set features, a null and a missing one counted alike. */
const bagOf = (value: unknown) =>
	canonicalJson(
		Object.fromEntries(
			Object.entries((value ?? {}) as Values).filter(
				([, feature]) => feature !== null && feature !== undefined,
			),
		),
	);

/** The cell: a pillar's coordinates in Core and the Surface's inflection. */
function cellOf(attestation: AttestationValue): string {
	const core = attestation.surface.lemma.coreFeatures as Values;
	return canonicalJson({
		core: bagOf({
			case: core.case,
			number: core.number,
			gender: core.gender,
			person: core.person,
			polite: core.polite,
		}),
		inflection: bagOf(attestation.surface.inflectionalFeatures),
	});
}

/** Scores one attempt against its case's gold Attestation. */
export function evaluateGrammar(
	ideal: Dumling.Attestation,
	output: GrammarOutput,
): GrammarEvaluation {
	const gold = ideal as unknown as AttestationValue;
	const hasValency = "valencyEvidence" in gold;
	const base = {
		outcome: output._tag,
		...(output.reason === undefined ? {} : { reason: output.reason }),
	};
	if (output._tag !== "Resolved" || output.attestation === undefined)
		return {
			...base,
			lemma: false,
			cell: false,
			members: false,
			spelling: false,
			...(hasValency ? { valency: false } : {}),
			exact: false,
		};
	const got = output.attestation as AttestationValue;
	const surfaceSpelling = (attestation: AttestationValue) =>
		canonicalJson({
			normalizedSurface: attestation.surface.normalizedSurface,
			spelling: attestation.surface.spelling,
			surfaceFeatures: attestation.surface.surfaceFeatures,
		});
	return {
		...base,
		lemma:
			lemmaIdentityKey(got.surface.lemma) ===
			lemmaIdentityKey(gold.surface.lemma),
		cell: cellOf(got) === cellOf(gold),
		members: canonicalJson(got.members) === canonicalJson(gold.members),
		spelling: surfaceSpelling(got) === surfaceSpelling(gold),
		...(hasValency
			? {
					valency:
						canonicalJson(got.valencyEvidence ?? []) ===
						canonicalJson(gold.valencyEvidence),
				}
			: {}),
		exact: canonicalJson(got) === canonicalJson(gold),
	};
}

/** A proportion with its count and 95% Wilson interval. */
export type Line = {
	readonly correct: number;
	readonly count: number;
	readonly rate: number;
	readonly interval: readonly [number, number];
};

/** The 95% Wilson score interval of `correct` out of `count`. */
export function wilson(
	correct: number,
	count: number,
): readonly [number, number] {
	if (count === 0) return [0, 1];
	const z = 1.959964;
	const p = correct / count;
	const denominator = 1 + (z * z) / count;
	const centre = (p + (z * z) / (2 * count)) / denominator;
	const half =
		(z * Math.sqrt((p * (1 - p)) / count + (z * z) / (4 * count * count))) /
		denominator;
	return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

export function lineOf(verdicts: readonly boolean[]): Line {
	const correct = verdicts.filter(Boolean).length;
	return {
		correct,
		count: verdicts.length,
		rate: verdicts.length === 0 ? 0 : correct / verdicts.length,
		interval: wilson(correct, verdicts.length),
	};
}

/** One attempt as the metrics read it: its case and its scores. */
export type ScoredAttempt = {
	readonly caseId: string;
	readonly repetition: number;
	/** The gold route, `Family/Kind`. */
	readonly route: string;
	readonly record: string;
	readonly rules: readonly string[];
	readonly evaluation: GrammarEvaluation | undefined;
};

const lines = ["lemma", "cell", "members", "spelling", "exact"] as const;

/** The per-field table of some attempts: the headline and the field lines. */
function tableOf(attempts: readonly ScoredAttempt[]) {
	const scores = attempts.map(({ evaluation }) => evaluation);
	const verdicts = (line: (typeof lines)[number]) =>
		scores.map((evaluation) => evaluation?.[line] ?? false);
	const valency = scores.flatMap((evaluation) =>
		evaluation?.valency === undefined ? [] : [evaluation.valency],
	);
	return {
		...(Object.fromEntries(
			lines.map((line) => [line, lineOf(verdicts(line))]),
		) as Record<(typeof lines)[number], Line>),
		valencyEvidence: lineOf(valency),
	};
}

/**
 * Named slices of the evaluation (#873's folded cases): the records of
 * the Rules #709 and #542 fold in, the Foreign route of #687, the
 * closed DET and PRON routes, and the out-of-bracket circumpositions of
 * #707.
 */
const grammarSlices: Readonly<
	Record<string, (attempt: ScoredAttempt) => boolean>
> = {
	"adjectival nouns and attributive-only adjectives (#709)": ({ rules }) =>
		rules.some((rule) =>
			[
				"de/adjectival-noun-lemma",
				"de/neuter-adjectival-noun",
				"de/attributive-adjective-stands-alone",
			].includes(rule),
		),
	"NOUN Case (#542)": ({ route, rules }) =>
		route === "Lexeme/NOUN" &&
		rules.includes("de/empty-inflection-is-structural"),
	"Foreign (#687)": ({ route }) => route === "Foreign/Foreign",
	"closed DET and PRON (#864)": ({ route }) =>
		route === "Lexeme/DET" || route === "Lexeme/PRON",
	"circumpositions and bracket particles (#707)": ({ rules }) =>
		rules.includes("de/bracket-particle-or-circumposition"),
};

/** The cases whose headline verdict differs between repetitions. */
function flipsOf(attempts: readonly ScoredAttempt[]): string[] {
	const verdicts = new Map<string, Set<boolean>>();
	for (const { caseId, evaluation } of attempts) {
		const seen = verdicts.get(caseId) ?? new Set<boolean>();
		seen.add(evaluation?.lemma ?? false);
		verdicts.set(caseId, seen);
	}
	return [...verdicts]
		.filter(([, seen]) => seen.size > 1)
		.map(([caseId]) => caseId)
		.sort();
}

/** Counts by a key, sorted by count. */
function tally(values: readonly string[]): Record<string, number> {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return Object.fromEntries(
		[...counts].sort((left, right) => right[1] - left[1]),
	);
}

/** The whole report: headline, field lines, slices, routes, outcomes and flips. */
export function grammarReport(attempts: readonly ScoredAttempt[]) {
	const repetitions = [
		...new Set(attempts.map(({ repetition }) => repetition)),
	];
	return {
		attempts: attempts.length,
		cases: new Set(attempts.map(({ caseId }) => caseId)).size,
		table: tableOf(attempts),
		byRepetition: Object.fromEntries(
			repetitions.map((repetition) => [
				repetition,
				lineOf(
					attempts
						.filter((attempt) => attempt.repetition === repetition)
						.map(({ evaluation }) => evaluation?.lemma ?? false),
				),
			]),
		),
		slices: Object.fromEntries(
			Object.entries(grammarSlices).map(([name, inSlice]) => [
				name,
				tableOf(attempts.filter(inSlice)),
			]),
		),
		routes: Object.fromEntries(
			[...new Set(attempts.map(({ route }) => route))]
				.sort()
				.map((route) => [
					route,
					lineOf(
						attempts
							.filter((attempt) => attempt.route === route)
							.map(
								({ evaluation }) => evaluation?.lemma ?? false,
							),
					),
				]),
		),
		outcomes: tally(
			attempts.map(({ evaluation }) => evaluation?.outcome ?? "Failed"),
		),
		reasons: tally(
			attempts.flatMap(({ evaluation }) =>
				evaluation && evaluation.outcome !== "Resolved"
					? [evaluation.reason ?? evaluation.outcome]
					: [],
			),
		),
		flips: flipsOf(attempts),
	};
}
