/**
 * Scores a later Reading's Licences on the German Doublet Rule's gold
 * (#1260). Per dimension the stored Reading holds forms of, an attempt is
 * right when the Licence its changes leave the later Reading is gold's
 * forms exactly. The report also reads the steps on the way: Luna's forms
 * against gold, which dimensions code matched and which went to the
 * judge, and whether the judge picked what gold holds of the forms it was
 * shown, so a miss reads as Luna's or the judge's.
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
	outcome: z.enum(["Matched", "Judged"]),
	written: z.array(z.string()),
	forms: z.array(z.string()).optional(),
	variants: z.array(z.string()),
	probabilities: z.record(z.string(), z.number()).optional(),
});

const dimensionVerdictSchema = z.object({
	dimension: z.string(),
	stored: z.array(z.string()),
	gold: z.array(z.string()),
	/** What Luna wrote, by id; absent when no licence event came. */
	written: z.array(z.string()).optional(),
	outcome: z.enum(["Matched", "Judged"]).optional(),
	/** The forms the judge was shown, by id. */
	shown: z.array(z.string()).optional(),
	probabilities: z.record(z.string(), z.number()).optional(),
	/** The Licence the run's changes leave the later Reading. */
	licensed: z.array(z.string()),
	failed: z.string().optional(),
});
type DimensionVerdict = z.infer<typeof dimensionVerdictSchema>;

export const licenceEvaluationSchema = z.object({
	verdicts: z.array(dimensionVerdictSchema),
});
export type LicenceEvaluation = z.infer<typeof licenceEvaluationSchema>;

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
	const { lemma } = licenceCase.later.reading;
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
			const ids = (values: readonly string[] | undefined) => [
				...new Set(
					(values ?? []).map((value) =>
						variantIdOf(lemma, dimension, value),
					),
				),
			];
			const event = events.get(dimension);
			const failed = output.failures.find(
				(failure) => failure.aspect === dimension,
			)?.code;
			return {
				dimension,
				stored: ids(licenceCase.stored.paradigm[dimension]),
				gold: ids(licenceCase.later.gold.paradigm[dimension]),
				...(event
					? {
							written: ids(event.written),
							outcome: event.outcome,
							...(event.forms ? { shown: ids(event.forms) } : {}),
							...(event.probabilities
								? { probabilities: event.probabilities }
								: {}),
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

const right = (verdict: DimensionVerdict) =>
	same(verdict.licensed, verdict.gold);

/** Whether the judge took exactly what gold holds of the forms it was shown. */
const judgeRight = (verdict: DimensionVerdict) =>
	same(
		verdict.licensed,
		(verdict.shown ?? []).filter((id) => verdict.gold.includes(id)),
	);

/**
 * The report of a run: Licences per dimension and per stored variant,
 * Luna's forms, the matched and judged dimensions, whole cases, the Free
 * controls, the judge requests per attempt, each Lemma's line, and every
 * miss.
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
	const verdicts = scored.map(({ verdict }) => verdict);
	let decisions = 0;
	let rightDecisions = 0;
	let wrongTakes = 0;
	let wrongDrops = 0;
	for (const verdict of verdicts)
		for (const id of verdict.stored) {
			decisions++;
			const took = verdict.licensed.includes(id);
			const should = verdict.gold.includes(id);
			if (took === should) rightDecisions++;
			else if (took) wrongTakes++;
			else wrongDrops++;
		}
	const byAttempt = new Map<ScoredLicence, DimensionVerdict[]>();
	for (const { attempt, verdict } of scored)
		byAttempt.set(attempt, [...(byAttempt.get(attempt) ?? []), verdict]);
	const wholeCases = [...byAttempt.entries()];
	const controls = wholeCases.filter(([attempt]) => attempt.control);
	const withOutcome = (outcome: "Matched" | "Judged") =>
		verdicts.filter((verdict) => verdict.outcome === outcome);
	const lemmas = [...new Set(attempts.map(({ lemma }) => lemma))].sort();
	return {
		attempts: attempts.length,
		unscored: attempts.filter(({ evaluation }) => !evaluation).length,
		dimensions: line(verdicts.filter(right).length, verdicts.length),
		variants: {
			...line(rightDecisions, decisions),
			wrongTakes,
			wrongDrops,
		},
		luna: line(
			verdicts.filter(
				(verdict) =>
					verdict.written !== undefined &&
					same(verdict.written, verdict.gold),
			).length,
			verdicts.length,
		),
		matched: line(
			withOutcome("Matched").filter(right).length,
			withOutcome("Matched").length,
		),
		judged: {
			...line(
				withOutcome("Judged").filter(right).length,
				withOutcome("Judged").length,
			),
			givenForms: line(
				withOutcome("Judged").filter(judgeRight).length,
				withOutcome("Judged").length,
			),
		},
		failed: verdicts.filter(({ failed }) => failed).length,
		cases: line(
			wholeCases.filter(([, entries]) => entries.every(right)).length,
			wholeCases.length,
		),
		freeControls: line(
			controls.filter(([, entries]) => entries.every(right)).length,
			controls.length,
		),
		judgeRequests: line(
			wholeCases.filter(([, entries]) =>
				entries.some(({ outcome }) => outcome === "Judged"),
			).length,
			wholeCases.length,
		),
		byLemma: Object.fromEntries(
			lemmas.map((lemma) => {
				const own = scored
					.filter(({ attempt }) => attempt.lemma === lemma)
					.map(({ verdict }) => verdict);
				return [lemma, line(own.filter(right).length, own.length)];
			}),
		),
		misses: scored
			.filter(({ verdict }) => !right(verdict))
			.map(({ attempt, verdict }) => ({
				caseId: attempt.caseId,
				repetition: attempt.repetition,
				dimension: verdict.dimension,
				gold: verdict.gold,
				written: verdict.written ?? null,
				outcome: verdict.outcome ?? null,
				licensed: verdict.licensed,
				probabilities: verdict.probabilities ?? null,
				...(verdict.failed ? { failed: verdict.failed } : {}),
			})),
	};
}
