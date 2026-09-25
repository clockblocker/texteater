import { germanAdpositionCases } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/**
 * Reviewed German prepositions a governor can lexically select. Their cases
 * come from Dumling's ADP Case Table (`für` Acc; `auf` two-way, so
 * `warten auf` + Acc and `bestehen auf` + Dat). The Lemma shape matches what
 * Grammatical Resolution produces for the same preposition, so stored claims
 * join the preposition's own Readings.
 */
export const governablePrepositionForms = [
	"an",
	"auf",
	"aus",
	"bei",
	"für",
	"gegen",
	"in",
	"mit",
	"nach",
	"über",
	"um",
	"unter",
	"von",
	"vor",
	"zu",
	"zwischen",
] as const;

export type GovernablePreposition = (typeof governablePrepositionForms)[number];

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
	return (governablePrepositionForms as readonly string[]).includes(form);
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
			partType: null,
		},
	};
}

/**
 * The one case the ADP Case Table allows a governable preposition, or null
 * when the governing construction chooses among several (`auf`).
 */
export function fixedCaseOf(
	form: GovernablePreposition,
): Dumrel.GovernedCase | null {
	const allowed =
		germanAdpositionCases(governablePrepositionLemma(form))?.allowed ?? [];
	return allowed.length === 1 ? (allowed[0] ?? null) : null;
}

/** The case a governed preposition assigns: fixed by the table, else by the construction. */
export function governedCaseFor(
	form: GovernablePreposition,
	constructionCase: Dumrel.GovernedCase,
): Dumrel.GovernedCase {
	return fixedCaseOf(form) ?? constructionCase;
}
