/**
 * The port through which the segmenters reach jev (TypeSafe System One). A
 * stage hands one request, its judge state and its questions, to an injected
 * `ask` and reads the answers; it never picks a model, counts tokens or
 * caches. `segment.inUnits` backs it with Dumgen's call adapter, the lab
 * with its disk cache, and a test with a fake.
 *
 * Nothing here reads files or imports `node:*`, so a host in a short-lived
 * isolate can run the segmenters.
 */
import * as Effect from "effect/Effect";
import type { EntryType, Question, Questions } from "promptsmith/typesafe";
import type { InvalidModelOutput, ProviderFailure } from "../errors.js";

export type Answer =
	| { readonly type: "noul"; readonly noul: number }
	| {
			readonly type: "choice";
			readonly choice: string;
			readonly confidence: number;
			readonly probabilities: Readonly<Record<string, number>>;
	  }
	| {
			readonly type: "score";
			readonly score: number;
			readonly confidence: number;
			readonly probabilities: Readonly<Record<string, number>>;
	  };

export type Answers = Readonly<Record<string, Answer>>;

export type AskRequest = {
	/**
	 * Which request of the segmenter this is (`segments`, `candidates`,
	 * `route`, …). A host may key spend and prompt hashes by it; it is not
	 * sent to jev.
	 */
	readonly stage: string;
	readonly state: Readonly<Record<string, EntryType>>;
	readonly questions: Questions;
};

/** Why a request brought no answers: none came back, or unusable ones. */
export type AskFailure = ProviderFailure | InvalidModelOutput;

/** Answers every question of one request against its state, or fails. */
export type Ask = (request: AskRequest) => Effect.Effect<Answers, AskFailure>;

/** Asks only when the request has a question; an empty request answers nothing. */
export const askAny = (
	ask: Ask,
	request: AskRequest,
): Effect.Effect<Answers, AskFailure> =>
	Object.keys(request.questions).length > 0
		? ask(request)
		: Effect.succeed({});

export const noul = (
	instructions: EntryType,
	criteria?: { true?: EntryType; false?: EntryType },
): Question => ({
	type: "noul",
	instructions,
	...(criteria ? { criteria } : {}),
});

export const choice = (
	instructions: EntryType,
	criteria: Record<string, EntryType>,
): Question => ({ type: "choice", instructions, criteria });

/**
 * The Noul answer to `id`. Dumgen's call adapter checks every answer
 * against its question, so a missing one here means a stage read a
 * question it never asked: a bug.
 */
export function noulOf(answers: Answers, id: string): number {
	const answer = answers[id];
	if (answer?.type !== "noul") throw Error(`No Noul answer ${id}`);
	return answer.noul;
}

/** The Choice answer to `id`; like `noulOf`, a missing one is a bug. */
export function choiceOf(
	answers: Answers,
	id: string,
): Extract<Answer, { type: "choice" }> {
	const answer = answers[id];
	if (answer?.type !== "choice") throw Error(`No Choice answer ${id}`);
	return answer;
}
