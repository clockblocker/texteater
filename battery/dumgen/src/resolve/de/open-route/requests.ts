/**
 * The jev requests of an open-route click: the first, `grammar`, and the
 * follow-ups a NOUN may need, its Case over the cells still open and
 * whether a noun in free gender variation has its free sense here.
 */
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { Answers, Ask, AskFailure } from "../../../segment/ask.js";
import { type CaseOption, fill, options, question } from "../prompts.js";
import { Answered, Questionnaire, type Unresolved } from "../questions.js";
import type { targetState } from "../target.js";
import { caseQuestion } from "./nominal.js";

/** The first request, sent only when it asks something. */
export function grammarRequest(
	ask: Ask,
	state: ReturnType<typeof targetState>,
	questionnaire: Questionnaire,
): Effect.Effect<Answers, AskFailure> {
	return questionnaire.empty
		? Effect.succeed({})
		: ask({
				stage: "grammar",
				state: { ...state, policy: questionnaire.policyBlock() },
				questions: questionnaire.questions,
			});
}

/** The Case question over the cells still open, asked only when more than one is. */
export function caseRequest(
	ask: Ask,
	state: ReturnType<typeof targetState>,
	open: readonly CaseOption[],
): Effect.Effect<CaseOption | Unresolved | undefined, AskFailure> {
	// @effect-diagnostics-next-line effectSucceedWithVoid:off -- Effect.void is Effect<void>, which the `| undefined` success type rejects
	if (open.length <= 1) return Effect.succeed(undefined);
	return Effect.gen(function* () {
		const questionnaire = new Questionnaire();
		const asked = caseQuestion(questionnaire, open);
		const answered = yield* ask({
			stage: "case",
			state: {
				...state,
				policy: questionnaire.policyBlock(),
			},
			questions: questionnaire.questions,
		});
		return Result.merge(new Answered(answered).pick(asked));
	});
}

/**
 * Whether a listed noun in free gender variation has, here, the one sense
 * that takes either gender (Rule de/noun-gender-in-free-variation).
 */
export function senseRequest(
	ask: Ask,
	state: ReturnType<typeof targetState>,
	sense: string,
): Effect.Effect<"Yes" | "No" | Unresolved, AskFailure> {
	return Effect.gen(function* () {
		const questionnaire = new Questionnaire();
		const asked = questionnaire.choice(
			"freeGender",
			fill(question.nounFreeGender, { sense }),
			options.freeGender,
		);
		const answered = yield* ask({
			stage: "freeGender",
			state: { ...state, policy: questionnaire.policyBlock() },
			questions: questionnaire.questions,
		});
		return Result.merge(new Answered(answered).pick(asked));
	});
}
