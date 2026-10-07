/** The case, gender and number questions of a word that agrees with a noun. */

import { question } from "../prompts.js";
import type { Questionnaire } from "../questions.js";
import { caseNames, genders, numbers } from "./shape.js";

/** Asks an agreeing word's case, gender and number. */
export function agreementQuestions(questionnaire: Questionnaire) {
	questionnaire.choice("agreement.case", question.agreementCase, caseNames);
	questionnaire.choice("agreement.gender", question.agreementGender, {
		...genders,
		Unmarked: "No gender: plural agreement",
	});
	questionnaire.choice("agreement.number", question.agreementNumber, numbers);
}
