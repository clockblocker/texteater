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

/** A governed preposition with the case it assigns in its construction. */
export type GovernedPrepositionDraft = {
	readonly preposition: GovernablePreposition;
	readonly case: Dumrel.GovernedCase;
};

const pronominalAdverb = new RegExp(
	`^(?:(?:da|wo)r?|hier|dr)(${governablePrepositionForms.join("|")})$`,
	"u",
);

/**
 * The governable preposition a Segment surface realizes: the preposition
 * itself, or the one inside a pronominal adverb (`darauf`, `worüber`,
 * `hierfür`, colloquial `dran`). A fused word's adposition component already
 * carries the preposition as its surface (`am` places `an`).
 */
export function governablePrepositionIn(
	surface: string,
): GovernablePreposition | null {
	const form = surface.normalize("NFC").toLocaleLowerCase("de");
	if (isGovernablePreposition(form)) return form;
	const inner = pronominalAdverb.exec(form)?.[1];
	return inner && isGovernablePreposition(inner) ? inner : null;
}

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
