/**
 * Answers `resolve.reading`'s calls from a case's gold Reading, as a judge
 * and a writer that are always right would: the judge picks gold's
 * description when it is offered and answers NoMatch when it is not, and
 * Luna writes gold's description. A pricing pass replays these answers to
 * find every request a run would send; the harness's tests run on them.
 * It reads gold only; no model.
 */
import type { Question, Questions } from "@typesafe-ai/sdk";
import type { Answer, Answers } from "../../../src/segment/ask.js";
import type { GoldOracle } from "../resolve-grammar/models.js";
import { descriptionKey, type ReadingArm, type ReadingCase } from "./cases.js";

/** One attempt's case and arm: what the cache's oracle answers for. */
export type ReadingAttempt = {
	readonly goldCase: ReadingCase;
	readonly arm: ReadingArm;
};

const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

/** The option naming gold's description, else NoMatch, else the first. */
function readingChoice(goldCase: ReadingCase, question: Question): string {
	if (question.type !== "choice") return "";
	const ideal = descriptionKey(goldCase, goldCase.ideal);
	const options = Object.entries(question.criteria);
	const gold = options.find(
		([option, description]) =>
			option !== "NoMatch" &&
			typeof description === "string" &&
			descriptionKey(goldCase, description) === ideal,
	);
	if (gold) return gold[0];
	if ("NoMatch" in question.criteria) return "NoMatch";
	return options[0]?.[0] ?? "";
}

/** Gold's answers to every question of a request. */
export function goldReadingAnswers(
	{ goldCase }: ReadingAttempt,
	questions: Questions,
): Answers {
	return Object.fromEntries(
		Object.entries(questions).map(([id, question]) => [
			id,
			picked(readingChoice(goldCase, question)),
		]),
	);
}

/** What gold writes: its own description. */
const goldReadingWritten = ({ goldCase }: ReadingAttempt): unknown =>
	goldCase.ideal;

export const readingOracle: GoldOracle<ReadingAttempt> = {
	answers: goldReadingAnswers,
	written: goldReadingWritten,
};
