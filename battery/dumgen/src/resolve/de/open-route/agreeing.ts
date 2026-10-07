/**
 * The block of a word that agrees with a noun (a NUM or SYM Lexeme, a DET,
 * NUM or PRON Locution): whether it inflects here, and its case, gender
 * and number, which an attributive ADJ is asked too.
 */

import { question } from "../prompts.js";
import type { Answered, Questionnaire } from "../questions.js";
import { caseNames, genders, numbers, type Values } from "./shape.js";

/** Asks an agreeing word's case, gender and number. */
export function agreementQuestions(questionnaire: Questionnaire) {
	questionnaire.choice("agreement.case", question.agreementCase, caseNames);
	questionnaire.choice("agreement.gender", question.agreementGender, {
		...genders,
		Unmarked: "No gender: plural agreement",
	});
	questionnaire.choice("agreement.number", question.agreementNumber, numbers);
}

/** Reads an agreeing word's case, gender and number: a plural has no gender. */
export function readAgreement(answered: Answered) {
	const number = answered.pick("agreement.number");
	const gender = answered.pick("agreement.gender");
	return {
		case: answered.pick("agreement.case"),
		gender: gender === "Unmarked" || number === "Plur" ? null : gender,
		number,
	};
}

/** Asks whether an agreeing word inflects here, and its agreement. */
export function askAgreeing(questionnaire: Questionnaire): void {
	questionnaire.choice(
		"inflects",
		question.inflects,
		{ Yes: "It inflects here", No: "Invariant here" },
		["inflection"],
	);
	agreementQuestions(questionnaire);
}

/** Reads an agreeing word's block: its agreement when it inflects here. */
export function readAgreeing(answered: Answered): {
	readonly core: Values;
	readonly inflection: Values | null;
} {
	const inflects = answered.pick("inflects") === "Yes";
	return { core: {}, inflection: inflects ? readAgreement(answered) : null };
}
