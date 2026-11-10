/**
 * The block of a word that agrees with a noun (a NUM or SYM Lexeme, a DET,
 * NUM or PRON Locution): whether it inflects here, and its case, gender
 * and number, which an attributive ADJ is asked too.
 */

import type * as Dumling from "dumling/types";
import { options, question } from "../prompts.js";
import {
	type Answered,
	answerReader,
	type ChoiceOf,
	optionsOf,
	type Questionnaire,
	type ReaderBody,
} from "../questions.js";
import type { Target } from "../target.js";
import { surfaceCases } from "./surface-cases.js";

/** An agreeing word's case, gender and number, as a NUM Lexeme's Surface takes them. */
export type Agreement = NonNullable<
	Dumling.Surface<"de", "Lexeme", "NUM">["inflectionalFeatures"]
>;

/** The questions of an agreeing word's case, gender and number. */
export type AgreementQuestions = ReturnType<typeof agreementQuestions>;

/**
 * Asks an agreeing word's case, gender and number: its case over the
 * cases it can take where it stands (`surface-cases.ts`), and none when
 * only one is left.
 */
export function agreementQuestions(
	questionnaire: Questionnaire,
	target: Target,
) {
	const cases = surfaceCases(target, target.units);
	return {
		cases,
		case:
			cases.length > 1
				? questionnaire.choice(
						"agreement.case",
						question.agreementCase,
						optionsOf(cases, options.case),
					)
				: undefined,
		gender: questionnaire.choice(
			"agreement.gender",
			question.agreementGender,
			options.agreementGender,
		),
		number: questionnaire.choice(
			"agreement.number",
			question.agreementNumber,
			options.number,
		),
	};
}

/** Reads an agreeing word's case, gender and number: a plural has no gender. */
export const readAgreement = answerReader(function* (
	agreement: AgreementQuestions,
	answered: Answered,
): ReaderBody<Agreement> {
	const number = yield* answered.pick(agreement.number);
	const gender = yield* answered.pick(agreement.gender);
	// Where it stands leaves at least one case, and one asks nothing.
	const [only = null] = agreement.cases;
	return {
		case: agreement.case ? yield* answered.pick(agreement.case) : only,
		gender: gender === "Unmarked" || number === "Plur" ? null : gender,
		number,
	};
});

/** What an agreeing word's block asked. */
export type AgreeingPlan = AgreementQuestions & {
	readonly inflects: ChoiceOf<typeof options.inflects>;
};

/** Asks whether an agreeing word inflects here, and its agreement. */
export function askAgreeing(
	questionnaire: Questionnaire,
	target: Target,
): AgreeingPlan {
	const inflects = questionnaire.choice(
		"inflects",
		question.inflects,
		options.inflects,
		["inflection"],
	);
	return { inflects, ...agreementQuestions(questionnaire, target) };
}

/** Reads an agreeing word's block: its agreement when it inflects here. */
export const readAgreeing = answerReader(function* (
	agreeing: AgreeingPlan,
	answered: Answered,
): ReaderBody<{
	readonly core: Record<string, never>;
	readonly inflection: Agreement | null;
}> {
	const inflects = (yield* answered.pick(agreeing.inflects)) === "Yes";
	return {
		core: {},
		inflection: inflects ? yield* readAgreement(agreeing, answered) : null,
	};
});
