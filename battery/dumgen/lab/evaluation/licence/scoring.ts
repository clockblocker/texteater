/**
 * Scores the licence judge on the German Doublet Rule's gold (#1230).
 * Per dimension of a case, the judge is right when it takes exactly the
 * stored variants the later Reading's gold forms hold, which is NoMatch
 * when they hold none. The Licence the run ends with is read twice:
 * against what the rule would give with a perfect judge and writer (the
 * judge's right pick, or gold's forms after NoMatch), and against gold's
 * forms themselves, which a later Reading whose stored variants are a
 * strict part of its gold misses by design until a later occurrence adds
 * the rest (#1234).
 */
import { readingIdentityKey } from "dumling";
import { applyParadigmChanges, licensed, variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { z } from "zod";
import { type LicenceCase, storedParadigmOf } from "./cases.js";

/** What one attempt stores: its Paradigm Changes, failures and trace events. */
export const licenceOutputSchema = z.object({
	paradigmChanges: z.array(z.unknown()),
	failures: z.array(
		z.object({ aspect: z.string(), code: z.string(), message: z.string() }),
	),
	events: z
		.array(z.object({ name: z.string(), data: z.unknown() }))
		.default([]),
});
export type LicenceOutput = z.infer<typeof licenceOutputSchema>;

const eventSchema = z.object({
	dimension: z.string(),
	outcome: z.enum(["Licensed", "NoMatch"]),
	variants: z.array(z.string()).optional(),
	nouls: z.record(z.string(), z.number()),
});

const dimensionVerdictSchema = z.object({
	dimension: z.string(),
	stored: z.array(z.string()),
	gold: z.array(z.string()),
	/** The stored variants gold takes; none is NoMatch. */
	expected: z.array(z.string()),
	/** What the judge took; absent when it gave no verdict. */
	judged: z.array(z.string()).optional(),
	nouls: z.record(z.string(), z.number()).optional(),
	/** The Licence the run's changes leave the later Reading. */
	licensed: z.array(z.string()),
	failed: z.string().optional(),
});
type DimensionVerdict = z.infer<typeof dimensionVerdictSchema>;

export const licenceEvaluationSchema = z.object({
	verdicts: z.array(dimensionVerdictSchema),
});
export type LicenceEvaluation = z.infer<typeof licenceEvaluationSchema>;

const ids = (
	licenceCase: LicenceCase,
	dimension: Dumrel.DimensionId,
	values: readonly string[] | undefined,
) => [
	...new Set(
		(values ?? []).map((value) =>
			variantIdOf(licenceCase.later.reading.lemma, dimension, value),
		),
	),
];

const sorted = (values: readonly string[]) => [...values].sort();
const same = (left: readonly string[], right: readonly string[]) =>
	JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

/** The Paradigm a run's changes leave, or the stored one when Dumrel refuses them. */
function paradigmAfter(
	licenceCase: LicenceCase,
	changes: readonly unknown[],
): Dumrel.LemmaParadigm {
	const stored = storedParadigmOf(licenceCase);
	const applied = applyParadigmChanges({
		lemma: licenceCase.later.reading.lemma,
		readings: [licenceCase.stored.reading, licenceCase.later.reading],
		paradigm: stored,
		changes,
	});
	return applied.success ? applied.value : stored;
}

/** One attempt's verdict per dimension the stored Reading holds forms of. */
export function evaluateLicence(
	licenceCase: LicenceCase,
	raw: LicenceOutput,
): LicenceEvaluation {
	const output = licenceOutputSchema.parse(raw);
	const after = paradigmAfter(licenceCase, output.paradigmChanges);
	const key = readingIdentityKey(licenceCase.later.reading);
	const events = new Map(
		output.events.flatMap(({ name, data }) => {
			const parsed = eventSchema.safeParse(data);
			return name === "ParadigmLicence" && parsed.success
				? [[parsed.data.dimension, parsed.data] as const]
				: [];
		}),
	);
	const verdicts = Object.keys(licenceCase.stored.paradigm).map(
		(name): DimensionVerdict => {
			const dimension = name as Dumrel.DimensionId;
			const stored = ids(
				licenceCase,
				dimension,
				licenceCase.stored.paradigm[dimension],
			);
			const gold = ids(
				licenceCase,
				dimension,
				licenceCase.later.gold.paradigm[dimension],
			);
			const event = events.get(dimension);
			const failed = output.failures.find(
				(failure) => failure.aspect === dimension,
			)?.code;
			return {
				dimension,
				stored,
				gold,
				expected: stored.filter((id) => gold.includes(id)),
				...(event
					? {
							judged:
								event.outcome === "NoMatch"
									? []
									: (event.variants ?? []),
							nouls: event.nouls,
						}
					: {}),
				licensed: [...licensed(after, dimension, key)],
				...(failed ? { failed } : {}),
			};
		},
	);
	return { verdicts };
}

/** One attempt as the report reads it. */
export type ScoredLicence = {
	readonly caseId: string;
	readonly repetition: number;
	readonly lemma: string;
	readonly control: boolean;
	readonly evaluation: LicenceEvaluation | undefined;
};

type Line = { correct: number; count: number; rate: number };
const line = (correct: number, count: number): Line => ({
	correct,
	count,
	rate: count === 0 ? 0 : correct / count,
});

/** The Licence a perfect judge and writer would end with: its pick, or gold after NoMatch. */
const ruleLicence = (verdict: DimensionVerdict) =>
	verdict.expected.length > 0 ? verdict.expected : verdict.gold;

/**
 * The report of a run: the judge per dimension and per stored variant,
 * NoMatch's precision and recall, whole cases, the Licences runs end
 * with, the Free controls, each Lemma's line, and every miss.
 */
export function licenceReport(attempts: readonly ScoredLicence[]) {
	const scored = attempts.flatMap((attempt) =>
		attempt.evaluation
			? attempt.evaluation.verdicts.map((verdict) => ({
					attempt,
					verdict,
				}))
			: [],
	);
	const judgedRight = ({ verdict }: (typeof scored)[number]) =>
		verdict.judged !== undefined && same(verdict.judged, verdict.expected);
	let decisions = 0;
	let rightDecisions = 0;
	let wrongTakes = 0;
	let wrongDrops = 0;
	for (const { verdict } of scored)
		for (const id of verdict.stored) {
			if (verdict.judged === undefined) continue;
			decisions++;
			const took = verdict.judged.includes(id);
			const should = verdict.expected.includes(id);
			if (took === should) rightDecisions++;
			else if (took) wrongTakes++;
			else wrongDrops++;
		}
	const expectedNoMatch = scored.filter(
		({ verdict }) => verdict.expected.length === 0,
	);
	const judgedNoMatch = scored.filter(
		({ verdict }) => verdict.judged?.length === 0,
	);
	const bothNoMatch = judgedNoMatch.filter(
		({ verdict }) => verdict.expected.length === 0,
	);
	const byAttempt = new Map<ScoredLicence, (typeof scored)[number][]>();
	for (const entry of scored)
		byAttempt.set(entry.attempt, [
			...(byAttempt.get(entry.attempt) ?? []),
			entry,
		]);
	const wholeCases = [...byAttempt.values()];
	const controls = wholeCases.filter(([first]) => first?.attempt.control);
	const lemmas = [...new Set(attempts.map(({ lemma }) => lemma))].sort();
	return {
		attempts: attempts.length,
		unscored: attempts.filter(({ evaluation }) => !evaluation).length,
		dimensions: line(scored.filter(judgedRight).length, scored.length),
		variants: {
			...line(rightDecisions, decisions),
			wrongTakes,
			wrongDrops,
		},
		noMatch: {
			precision: line(bothNoMatch.length, judgedNoMatch.length),
			recall: line(bothNoMatch.length, expectedNoMatch.length),
		},
		cases: line(
			wholeCases.filter((entries) => entries.every(judgedRight)).length,
			wholeCases.length,
		),
		licences: {
			asRuleGives: line(
				scored.filter(({ verdict }) =>
					same(verdict.licensed, ruleLicence(verdict)),
				).length,
				scored.length,
			),
			asGold: line(
				scored.filter(({ verdict }) =>
					same(verdict.licensed, verdict.gold),
				).length,
				scored.length,
			),
			failed: scored.filter(({ verdict }) => verdict.failed).length,
		},
		freeControls: line(
			controls.filter((entries) =>
				entries.every(
					({ verdict }) =>
						verdict.judged !== undefined &&
						same(verdict.judged, verdict.stored),
				),
			).length,
			controls.length,
		),
		byLemma: Object.fromEntries(
			lemmas.map((lemma) => {
				const own = scored.filter(
					({ attempt }) => attempt.lemma === lemma,
				);
				return [
					lemma,
					line(own.filter(judgedRight).length, own.length),
				];
			}),
		),
		misses: scored
			.filter((entry) => !judgedRight(entry))
			.map(({ attempt, verdict }) => ({
				caseId: attempt.caseId,
				repetition: attempt.repetition,
				dimension: verdict.dimension,
				expected: verdict.expected,
				judged: verdict.judged ?? null,
				nouls: verdict.nouls ?? null,
				...(verdict.failed ? { failed: verdict.failed } : {}),
			})),
	};
}
