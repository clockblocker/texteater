import { governedCaseValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	type GovernablePreposition,
	governablePrepositionForms,
	governedCaseFor,
	isGovernablePreposition,
} from "./prepositions.js";

/**
 * Asks for the Reading's valency, not this sentence's adjuncts. The sentence
 * and Emoji Description only fix the sense: `bestehen auf` (insist) and
 * `bestehen aus` (consist of) are different Readings of one Lemma.
 */
export const governedPrepositionsPrompt = `List the prepositions the fixed exact German Reading lexically governs, with the case each assigns to its complement in that construction. A governed preposition is selected by this Reading's meaning and is part of what a learner memorises with it: warten auf + Acc, bestehen auf + Dat (insist) but bestehen aus + Dat (consist of), stolz auf + Acc, Angst vor + Dat, sich bedanken bei + Dat and für + Acc, Bescheid wissen über + Acc. The marked sentence and the Reading's emojiDescription only fix the sense. Include a governed preposition even when this sentence leaves the complement out or realises it as a pronominal adverb such as darauf or worüber. Exclude free adjuncts of place, time, manner, cause or instrument (wartet am Bahnhof, schneidet mit dem Messer), separable verb particles (aufpassen), and prepositions that belong to a neighbouring word. For two-way prepositions (an, auf, in, über, unter, vor, zwischen) give the case the government requires, not the case a location would take. Choose prepositions only from the offered list. Return {governedPrepositions:[]} when the Reading governs none. Do not return definitions, Kinds or domain objects.`;

export const governedPrepositionsOutputSchema = {
	type: "object",
	properties: {
		governedPrepositions: {
			type: "array",
			maxItems: 4,
			items: {
				type: "object",
				properties: {
					preposition: {
						type: "string",
						enum: governablePrepositionForms,
					},
					case: { type: "string", enum: [...governedCaseValues] },
				},
				required: ["preposition", "case"],
				additionalProperties: false,
			},
		},
	},
	required: ["governedPrepositions"],
	additionalProperties: false,
} as const;

export type GovernedPrepositionDraft = {
	readonly preposition: GovernablePreposition;
	readonly case: Dumrel.GovernedCase;
};

/**
 * Validates the model output. A fixed-case preposition keeps its Lemma's case
 * whatever the model said; duplicates collapse.
 */
export function parseGovernedPrepositionsOutput(
	output: unknown,
): GovernedPrepositionDraft[] {
	if (
		!output ||
		typeof output !== "object" ||
		Object.keys(output).length !== 1 ||
		!("governedPrepositions" in output) ||
		!Array.isArray(output.governedPrepositions) ||
		output.governedPrepositions.length > 4
	)
		throw Error("Expected only a bounded governedPrepositions array");
	const result = new Map<string, GovernedPrepositionDraft>();
	for (const item of output.governedPrepositions as unknown[]) {
		if (
			!item ||
			typeof item !== "object" ||
			Object.keys(item).length !== 2 ||
			!("preposition" in item) ||
			!("case" in item) ||
			typeof item.preposition !== "string" ||
			!isGovernablePreposition(item.preposition) ||
			!governedCaseValues.includes(item.case as Dumrel.GovernedCase)
		)
			throw Error(
				"Each governed preposition needs a listed preposition and case",
			);
		const draft = {
			preposition: item.preposition,
			case: governedCaseFor(
				item.preposition,
				item.case as Dumrel.GovernedCase,
			),
		};
		result.set(`${draft.preposition}/${draft.case}`, draft);
	}
	return [...result.values()];
}
