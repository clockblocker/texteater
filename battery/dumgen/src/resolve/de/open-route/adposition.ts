/** An ADP's block of the first request, the case it realizes, and its reading. */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import { question } from "../prompts.js";
import type { Answered, Questionnaire } from "../questions.js";
import type { Target } from "../target.js";
import {
	type AdpCase,
	caseNames,
	fold,
	type Shape,
	spellingOf,
} from "./shape.js";

/** What an ADP's block asked: the cases the ADP Case Table lets it take. */
export type AdpositionPlan = { readonly cases: readonly AdpCase[] };

/** Asks the case an ADP realizes, when its table allows more than one. */
export function askAdposition(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
): AdpositionPlan {
	const [only] = target.members;
	const entry =
		shape.lexeme && only && target.members.length === 1
			? germanAdpositionEntry({
					family: "Lexeme",
					canonicalForm: fold(spellingOf(only)),
				})
			: null;
	const cases: readonly AdpCase[] = entry
		? germanAdpositionAllowedCases(entry)
		: ["Acc", "Dat", "Gen"];
	if (cases.length > 1)
		questionnaire.choice("realizedCase", question.realizedCase, {
			...Object.fromEntries(
				cases.map((value) => [value, caseNames[value]]),
			),
			None: question.realizedCaseNone,
		});
	return { cases };
}

/** Reads the case an ADP realizes: its table's only case, or jev's answer. */
export function readAdposition(
	adposition: AdpositionPlan,
	answered: Answered,
): AdpCase | "None" | undefined {
	const allowed = adposition.cases;
	return allowed.length === 1
		? allowed[0]
		: (answered.pick("realizedCase") as AdpCase | "None");
}
