import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/**
 * Reviewed German prepositions a governor can lexically select, with the case
 * their ADP Lemma fixes. `null` marks a two-way preposition whose case comes
 * from the governing construction (`warten auf` + Acc, `bestehen auf` + Dat).
 * The Lemma shape matches what Grammatical Resolution produces for the same
 * preposition, so stored claims join the preposition's own Readings.
 */
export const governablePrepositions = {
	an: null,
	auf: null,
	aus: "Dat",
	bei: "Dat",
	für: "Acc",
	gegen: "Acc",
	in: null,
	mit: "Dat",
	nach: "Dat",
	über: null,
	um: "Acc",
	unter: null,
	von: "Dat",
	vor: null,
	zu: "Dat",
	zwischen: null,
} as const satisfies Record<string, "Acc" | "Dat" | null>;

export type GovernablePreposition = keyof typeof governablePrepositions;

export const governablePrepositionForms = Object.keys(
	governablePrepositions,
) as GovernablePreposition[];

export function isGovernablePreposition(
	form: string,
): form is GovernablePreposition {
	return Object.hasOwn(governablePrepositions, form);
}

export function governablePrepositionLemma(
	form: GovernablePreposition,
): Dumling.Lemma<"de", "Lexeme", "ADP"> {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: form,
		coreFeatures: {
			abbr: null,
			adpType: "Prep",
			extPos: null,
			foreign: null,
			governedCase: governablePrepositions[form],
			partType: null,
		},
	};
}

/** The case a governed preposition assigns: fixed by its Lemma, else by the construction. */
export function governedCaseFor(
	form: GovernablePreposition,
	constructionCase: Dumrel.GovernedCase,
): Dumrel.GovernedCase {
	return governablePrepositions[form] ?? constructionCase;
}
