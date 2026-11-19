import {
	authoredRealizations,
	germanGovernablePrepositions,
} from "dumcorpus/inventories";

/** Determiners that open a noun phrase and never stand for one alone. */
const OPENING_DETERMINER_TYPES = new Set(["Art", "Dem", "Prs", "Neg"]);

/** The words that open a phrase in one language, lowercase. */
export type PhraseOpeners = {
	readonly determiners: ReadonlySet<string>;
	readonly prepositions: ReadonlySet<string>;
};

const GERMAN_PHRASE_OPENERS: PhraseOpeners = {
	determiners: new Set(
		authoredRealizations.flatMap(({ member, spelled }) => {
			const { lemma } = member;
			const pronType = (lemma.coreFeatures as { pronType?: unknown })
				.pronType;
			return lemma.language === "de" &&
				lemma.kind === "DET" &&
				typeof pronType === "string" &&
				OPENING_DETERMINER_TYPES.has(pronType)
				? [spelled.toLowerCase()]
				: [];
		}),
	),
	prepositions: new Set(germanGovernablePrepositions),
};

const NONE: PhraseOpeners = {
	determiners: new Set(),
	prepositions: new Set(),
};

/**
 * The words that open a phrase in `language`, lowercase: the articles,
 * demonstrative, possessive and negative determiners its Authored Inventory
 * holds, and its governable prepositions. A Source Context's excerpt never
 * cuts right after a determiner. A language without an inventory has none.
 */
export function phraseOpenersFor(language: string): PhraseOpeners {
	return language === "de" ? GERMAN_PHRASE_OPENERS : NONE;
}
