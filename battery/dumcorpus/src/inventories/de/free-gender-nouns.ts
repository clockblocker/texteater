import type * as Dumling from "dumling/types";

/** A German NOUN's `mixed` Core gender, as Dumling takes it. */
type GermanMixedGender = Extract<
	Dumling.Lemma<"de", "Lexeme", "NOUN">["coreFeatures"]["gender"],
	{ readonly mixed: unknown }
>;

/** A listed noun in free gender variation, and the sense that takes it. */
type GermanFreeGenderNoun = {
	readonly noun: string;
	readonly gender: GermanMixedGender;
	/**
	 * The one sense that takes either gender, in English, when the noun
	 * has others with one gender of their own; absent when every sense
	 * takes either.
	 */
	readonly sense?: string;
	readonly source: string;
};

/**
 * German nouns the dictionary gives more than one gender in the same sense,
 * as Duden gives them (Rule de/noun-gender-in-free-variation, #1036,
 * #1141). Each one's Core gender is `mixed`, its members in catalog order.
 * The list is not every such noun, only the ones checked; a gender that
 * changes the meaning (der See, die See) makes separate Lemmas and stays
 * off it.
 */
export const germanFreeGenderNouns: readonly GermanFreeGenderNoun[] = [
	{
		// Duden "Balg, der oder das; umgangssprachlich, meist abwertend";
		// der Balg, the skin or bellows, is another Lemma.
		noun: "Balg",
		gender: { mixed: ["Masc", "Neut"] },
		sense: "a child, colloquially and mostly pejoratively, not an animal's skin or a bellows",
		source: "https://www.duden.de/rechtschreibung/Balg_Kind",
	},
	{
		// Duden "Coca-Cola, das oder die".
		noun: "Coca-Cola",
		gender: { mixed: ["Fem", "Neut"] },
		source: "https://www.duden.de/rechtschreibung/Coca_Cola",
	},
	{
		// Duden "Cola, das oder die".
		noun: "Cola",
		gender: { mixed: ["Fem", "Neut"] },
		source: "https://www.duden.de/rechtschreibung/Cola",
	},
];

const fold = (form: string) => form.toLocaleLowerCase("de");
const byNoun = new Map(
	germanFreeGenderNouns.map((entry) => [fold(entry.noun), entry]),
);

/**
 * The listed noun in free gender variation a NOUN Canonical Form names,
 * compared without letter case.
 */
export function germanFreeGenderNoun(
	canonicalForm: string,
): GermanFreeGenderNoun | undefined {
	return byNoun.get(fold(canonicalForm));
}
