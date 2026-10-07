/**
 * The block of a word that agrees with a noun (a NUM or SYM Lexeme, a DET,
 * NUM or PRON Locution): whether it inflects here, and its case, gender
 * and number, which an attributive ADJ is asked too.
 */

import type * as Dumling from "dumling/types";
import { options, question } from "../prompts.js";
import type { Answered, ChoiceOf, Questionnaire } from "../questions.js";

/** An agreeing word's case, gender and number, as a NUM Lexeme's Surface takes them. */
export type Agreement = NonNullable<
	Dumling.Surface<"de", "Lexeme", "NUM">["inflectionalFeatures"]
>;

/** The questions of an agreeing word's case, gender and number. */
export type AgreementQuestions = ReturnType<typeof agreementQuestions>;

/** Asks an agreeing word's case, gender and number. */
export function agreementQuestions(questionnaire: Questionnaire) {
	return {
		case: questionnaire.choice(
			"agreement.case",
			question.agreementCase,
			options.case,
		),
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
export function readAgreement(
	agreement: AgreementQuestions,
	answered: Answered,
): Agreement {
	const number = answered.pick(agreement.number);
	const gender = answered.pick(agreement.gender);
	return {
		case: answered.pick(agreement.case),
		gender: gender === "Unmarked" || number === "Plur" ? null : gender,
		number,
	};
}

/** What an agreeing word's block asked. */
export type AgreeingPlan = AgreementQuestions & {
	readonly inflects: ChoiceOf<typeof options.inflects>;
};

/** Asks whether an agreeing word inflects here, and its agreement. */
export function askAgreeing(questionnaire: Questionnaire): AgreeingPlan {
	const inflects = questionnaire.choice(
		"inflects",
		question.inflects,
		options.inflects,
		["inflection"],
	);
	return { inflects, ...agreementQuestions(questionnaire) };
}

/** Reads an agreeing word's block: its agreement when it inflects here. */
export function readAgreeing(
	agreeing: AgreeingPlan,
	answered: Answered,
): {
	readonly core: Record<string, never>;
	readonly inflection: Agreement | null;
} {
	const inflects = answered.pick(agreeing.inflects) === "Yes";
	return {
		core: {},
		inflection: inflects ? readAgreement(agreeing, answered) : null,
	};
}
