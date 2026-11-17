/** An ADP's block of the first request, the case it realizes, and its reading. */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import * as Result from "effect/Result";
import { options, question } from "../prompts.js";
import {
	type Answered,
	type Choice,
	optionsOf,
	type Questionnaire,
	type Unresolved,
} from "../questions.js";
import type { Target } from "../target.js";
import { spelledApartPreposition } from "./code-headword.js";
import { type AdpCase, fold, type Shape, spellingOf } from "./shape.js";

/**
 * What an ADP's block asked: the cases the ADP Case Table lets it take,
 * and the question among them when there are several. `beforeVon` is set
 * when a genitive preposition stands right before von or vom (aufgrund von
 * Problemen): von governs the phrase, so the ADP realizes no case of its
 * own and nothing is asked.
 */
export type AdpositionPlan = {
	readonly cases: readonly AdpCase[];
	readonly realizedCase: Choice<AdpCase | "None"> | undefined;
	readonly beforeVon: boolean;
};

/**
 * The written word right after the target's last member, past whitespace:
 * the run of ResolvableText Segments there, joined, so the pieces vo and m
 * read as vom. Undefined when punctuation or the Sentence's end comes first.
 */
function wordAfter(target: Target): string | undefined {
	const last = target.members.at(-1);
	if (!last) return undefined;
	let index = last.segment + 1;
	while (target.segments[index]?.kind === "Whitespace") index++;
	let word = "";
	while (target.segments[index]?.kind === "ResolvableText")
		word += target.segments[index++]?.text ?? "";
	return word === "" ? undefined : word.toLocaleLowerCase("de");
}

/** Asks the case an ADP realizes, when its table allows more than one. */
export function askAdposition(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
): AdpositionPlan {
	const [only] = target.members;
	// auf Grund takes aufgrund's cases (de/preposition-spelled-apart).
	const canonicalForm =
		spelledApartPreposition(target) ??
		(only && target.members.length === 1
			? fold(spellingOf(only))
			: undefined);
	const entry =
		shape.lexeme && canonicalForm !== undefined
			? germanAdpositionEntry({ family: "Lexeme", canonicalForm })
			: null;
	const cases: readonly AdpCase[] = entry
		? germanAdpositionAllowedCases(entry)
		: ["Acc", "Dat", "Gen"];
	const next = wordAfter(target);
	const beforeVon =
		entry !== null &&
		cases.includes("Gen") &&
		(next === "von" || next === "vom");
	const realizedCase =
		!beforeVon && cases.length > 1
			? questionnaire.choice("realizedCase", question.realizedCase, {
					...optionsOf(cases, options.case),
					...options.realizedCase,
				})
			: undefined;
	return { cases, realizedCase, beforeVon };
}

/**
 * Reads the case an ADP realizes: none before von, else its table's only
 * case or jev's answer.
 */
export function readAdposition(
	adposition: AdpositionPlan,
	answered: Answered,
): Result.Result<AdpCase | "None", Unresolved> {
	const [only] = adposition.cases;
	if (adposition.beforeVon) return Result.succeed("None");
	if (adposition.realizedCase) return answered.pick(adposition.realizedCase);
	if (only === undefined)
		throw Error("The ADP Case Table lets the ADP take no case");
	return Result.succeed(only);
}
