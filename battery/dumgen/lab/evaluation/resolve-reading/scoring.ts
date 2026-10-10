/**
 * How a `resolve.reading` run is scored (#873). Each case runs in up to
 * three arms (`cases.ts`):
 *
 * - `present`, gold's Reading among the candidates: right when the click
 *   reuses gold's description.
 * - `removed`, gold's Reading taken out: right when the click comes back
 *   New, the judge's NoMatch. Only the removed attempts whose judge saw a
 *   candidate measure the judge; with nothing stored Luna writes at once.
 * - `empty`, nothing stored, a two-sense Lemma's first click: right when
 *   Luna's New names no other sense.
 *
 * A Reuse of another description than gold's gets its own line, in any
 * arm, because it is the error that merges senses. So does a New that
 * names another gold sense of the Lemma (#1165): it stores this sense
 * under the other's label, and it is wrong in every arm. An authored
 * Lemma's attempt is right when it names gold's description. A folded es
 * gibt case (#694) is wrong whenever it answers a rejected description.
 * Beyond those, Luna's New text is not scored: a sample goes to a human
 * spot-check (Sys ADR 0023).
 * Every line reports its count and a 95% Wilson interval, and the attempts
 * whose verdict flips between repetitions are named.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { lineOf } from "../resolve-grammar/scoring.js";
import {
	candidatesOf,
	descriptionKey,
	otherSensesOf,
	type ReadingArm,
	type ReadingCase,
} from "./cases.js";

/** What one attempt returned, as a run stores it. */
export const readingOutputSchema = z.object({
	_tag: z.enum(["Reuse", "New", "CatalogMiss"]),
	emojiDescription: z.string().optional(),
	message: z.string().optional(),
	/** What decided it, from the operation's trace. */
	reason: z.string().optional(),
});
export type ReadingOutput = z.infer<typeof readingOutputSchema>;

/** One attempt's verdicts. */
/** An attempt's evaluation as a run stores it. */
export const readingEvaluationSchema = z.object({
	outcome: readingOutputSchema.shape._tag,
	reason: z.string().optional(),
	answered: z.string().optional(),
	correct: z.boolean(),
	wrongReuse: z.boolean(),
	judged: z.boolean(),
	rejected: z.boolean(),
	/** Absent in runs scored before #1165. */
	wrongSense: z.boolean().optional(),
	matchesGold: z.boolean().optional(),
}) satisfies z.ZodType<ReadingEvaluation>;

export type ReadingEvaluation = {
	readonly outcome: ReadingOutput["_tag"];
	readonly reason?: string;
	readonly answered?: string;
	/** The arm's verdict. */
	readonly correct: boolean;
	/** A Reuse of another description than gold's. */
	readonly wrongReuse: boolean;
	/** Whether a judge saw a candidate: an open Lemma with something stored. */
	readonly judged: boolean;
	/** An answer among the case's rejected descriptions (#694). */
	readonly rejected: boolean;
	/** An answer naming another gold sense of the Lemma (#1165). */
	readonly wrongSense?: boolean;
	/** A removed attempt's New that is gold's description; informational. */
	readonly matchesGold?: boolean;
};

/** Scores one attempt against its case's gold Reading. */
export function evaluateReading(
	goldCase: ReadingCase,
	arm: ReadingArm,
	output: ReadingOutput,
): ReadingEvaluation {
	const { emojiDescription: answered } = output;
	const key =
		answered === undefined ? undefined : descriptionKey(goldCase, answered);
	const gold = key === descriptionKey(goldCase, goldCase.ideal);
	const rejected =
		key !== undefined &&
		goldCase.rejected.some(
			(description) => descriptionKey(goldCase, description) === key,
		);
	const wrongSense =
		key !== undefined &&
		otherSensesOf(goldCase).some(
			(description) => descriptionKey(goldCase, description) === key,
		);
	const correct = goldCase.authored
		? gold
		: arm === "present"
			? output._tag === "Reuse" && gold
			: output._tag === "New";
	return {
		outcome: output._tag,
		...(output.reason === undefined ? {} : { reason: output.reason }),
		...(answered === undefined ? {} : { answered }),
		correct: correct && !rejected && !wrongSense,
		wrongReuse: output._tag === "Reuse" && !gold,
		judged: !goldCase.authored && candidatesOf(goldCase, arm).length > 0,
		rejected,
		wrongSense,
		...(arm !== "present" && output._tag === "New"
			? { matchesGold: gold }
			: {}),
	};
}

/** One attempt as the metrics read it: its case, arm and verdicts. */
export type ScoredReading = {
	readonly caseId: string;
	readonly arm: ReadingArm;
	readonly repetition: number;
	/** The gold route, `Family/Kind`. */
	readonly route: string;
	readonly record: string;
	readonly lemma: string;
	readonly markedSentence: string;
	readonly ideal: string;
	readonly candidates: number;
	readonly authored: boolean;
	readonly folded: boolean;
	readonly evaluation: ReadingEvaluation | undefined;
};

const verdicts = (
	attempts: readonly ScoredReading[],
	line: (evaluation: ReadingEvaluation) => boolean = ({ correct }) => correct,
) =>
	lineOf(
		attempts.map(({ evaluation }) =>
			evaluation === undefined ? false : line(evaluation),
		),
	);

/** Counts by a key, sorted by count. */
function tally(values: readonly string[]): Record<string, number> {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return Object.fromEntries(
		[...counts].sort((left, right) => right[1] - left[1]),
	);
}

/** The attempts whose verdict differs between repetitions, `<case>:<arm>`. */
function readingFlips(attempts: readonly ScoredReading[]): string[] {
	const seen = new Map<string, Set<boolean>>();
	for (const { caseId, arm, evaluation } of attempts) {
		const id = `${caseId}:${arm}`;
		const verdicts = seen.get(id) ?? new Set<boolean>();
		verdicts.add(evaluation?.correct ?? false);
		seen.set(id, verdicts);
	}
	return [...seen]
		.filter(([, verdicts]) => verdicts.size > 1)
		.map(([id]) => id)
		.sort();
}

/** How many of Luna's New texts the spot-check sample holds. */
const spotCheckSize = 40;

/**
 * Luna's New texts for a human spot-check: written in a removed attempt at
 * the first repetition, a fixed pseudo-random sample by case.
 */
function spotCheckOf(attempts: readonly ScoredReading[]) {
	const hash = (id: string) => createHash("sha256").update(id).digest("hex");
	return attempts
		.filter(
			({ arm, repetition, evaluation }) =>
				arm !== "present" &&
				repetition === 0 &&
				evaluation?.outcome === "New" &&
				(evaluation.reason === "Written" ||
					evaluation.reason === "Drafted"),
		)
		.sort((left, right) =>
			hash(left.caseId) < hash(right.caseId) ? -1 : 1,
		)
		.slice(0, spotCheckSize)
		.map(({ caseId, lemma, markedSentence, ideal, evaluation }) => ({
			caseId,
			lemma,
			markedSentence,
			gold: ideal,
			written: evaluation?.answered ?? "",
		}));
}

/** The arm lines of some attempts: reuse when gold is offered, NoMatch when it is not, and a first click. */
function armLines(attempts: readonly ScoredReading[]) {
	return {
		reuse: verdicts(attempts.filter(({ arm }) => arm === "present")),
		noMatch: verdicts(
			attempts.filter(
				({ arm, evaluation }) =>
					arm === "removed" && evaluation?.judged,
			),
		),
		firstMint: verdicts(attempts.filter(({ arm }) => arm === "empty")),
	};
}

/** The whole report: the lines, the folded cases, routes, outcomes, flips and the spot-check. */
export function readingReport(attempts: readonly ScoredReading[]) {
	const open = attempts.filter(({ authored }) => !authored);
	const present = open.filter(({ arm }) => arm === "present");
	const removed = open.filter(({ arm }) => arm === "removed");
	const empty = open.filter(({ arm }) => arm === "empty");
	const folded = attempts.filter(({ folded }) => folded);
	const repetitions = [
		...new Set(attempts.map(({ repetition }) => repetition)),
	].sort();
	return {
		attempts: attempts.length,
		cases: new Set(attempts.map(({ caseId }) => caseId)).size,
		lines: {
			/** Gold offered: the judge reused it. */
			reuse: verdicts(present),
			/** Gold offered beside another description: a real choice. */
			reuseAmongSeveral: verdicts(
				present.filter(({ candidates }) => candidates > 1),
			),
			/** Gold removed, something else offered: the judge answered NoMatch. */
			noMatch: verdicts(
				removed.filter(({ evaluation }) => evaluation?.judged),
			),
			/** Gold removed and nothing stored: Luna wrote at once. */
			noMatchUnjudged: verdicts(
				removed.filter(({ evaluation }) => !evaluation?.judged),
			),
			/** A two-sense Lemma's first click, nothing stored: Luna named no other sense. */
			firstMint: verdicts(empty),
			/** Of all open attempts, those that reused another description than gold's. */
			wrongReuse: verdicts(open, ({ wrongReuse }) => wrongReuse),
			/** Of all open attempts, those that answered another gold sense's description. */
			wrongSense: verdicts(open, ({ wrongSense }) => wrongSense === true),
			/** Authored Lemmas: gold's authored description. */
			authored: verdicts(attempts.filter(({ authored }) => authored)),
			/** Existential es gibt (#694): right, and never a rejected answer. */
			esGibt: verdicts(folded),
			/** Of the attempts Luna answered New, those writing gold's description; not scored. */
			lunaMatchesGold: verdicts(
				[...removed, ...empty].filter(
					({ evaluation }) => evaluation?.matchesGold !== undefined,
				),
				({ matchesGold }) => matchesGold === true,
			),
		},
		esGibtRejected: folded.filter(({ evaluation }) => evaluation?.rejected)
			.length,
		wrongReuseBy: tally(
			open.flatMap(({ evaluation }) =>
				evaluation?.wrongReuse ? [evaluation.reason ?? "?"] : [],
			),
		),
		byRepetition: Object.fromEntries(
			repetitions.map((repetition) => [
				repetition,
				armLines(
					open.filter((attempt) => attempt.repetition === repetition),
				),
			]),
		),
		routes: Object.fromEntries(
			[...new Set(attempts.map(({ route }) => route))]
				.sort()
				.map((route) => [
					route,
					armLines(open.filter((attempt) => attempt.route === route)),
				]),
		),
		outcomes: tally(
			attempts.map(({ evaluation }) => evaluation?.outcome ?? "Failed"),
		),
		reasons: tally(
			attempts.map(
				({ evaluation }) =>
					evaluation?.reason ?? evaluation?.outcome ?? "Failed",
			),
		),
		flips: readingFlips(attempts),
		spotCheck: spotCheckOf(attempts),
	};
}
