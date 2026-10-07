/** An ADP's block of the first request, the case it realizes, and its reading. */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import { options, question } from "../prompts.js";
import {
	type Answered,
	type Choice,
	optionsOf,
	type Questionnaire,
} from "../questions.js";
import type { Target } from "../target.js";
import { type AdpCase, fold, type Shape, spellingOf } from "./shape.js";

/**
 * What an ADP's block asked: the cases the ADP Case Table lets it take,
 * and the question among them when there are several.
 */
export type AdpositionPlan = {
	readonly cases: readonly AdpCase[];
	readonly realizedCase: Choice<AdpCase | "None"> | undefined;
};

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
	const realizedCase =
		cases.length > 1
			? questionnaire.choice("realizedCase", question.realizedCase, {
					...optionsOf(cases, options.case),
					...options.realizedCase,
				})
			: undefined;
	return { cases, realizedCase };
}

/** Reads the case an ADP realizes: its table's only case, or jev's answer. */
export function readAdposition(
	adposition: AdpositionPlan,
	answered: Answered,
): AdpCase | "None" {
	const [only] = adposition.cases;
	if (adposition.realizedCase) return answered.pick(adposition.realizedCase);
	if (only === undefined)
		throw Error("The ADP Case Table lets the ADP take no case");
	return only;
}
