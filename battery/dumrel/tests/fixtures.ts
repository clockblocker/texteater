import type * as Dumling from "dumling/types";

export const houseLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Haus",
	coreFeatures: { gender: "Neut", hyph: null },
} as const satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;

export const houseReading = {
	unitKind: "Reading",
	lemma: houseLemma,
	emojiDescription: "🏠",
} as const satisfies Dumling.Reading<"de", "Lexeme", "NOUN">;

export const berlinLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "PROPN",
	canonicalForm: "Berlin",
	coreFeatures: { abbr: null, article: null, foreign: null, gender: "Neut" },
} as const satisfies Dumling.Lemma<"de", "Lexeme", "PROPN">;

export const prefixLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Morpheme",
	kind: "Prefix",
	canonicalForm: "un-",
	coreFeatures: { hasSepPrefix: null },
} as const satisfies Dumling.Lemma<"de", "Morpheme", "Prefix">;

const adposition = (canonicalForm: string) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm,
		coreFeatures: {
			abbr: null,
			adpType: "Prep",
			extPos: null,
			foreign: null,
			partType: null,
		},
	}) as const satisfies Dumling.Lemma<"de", "Lexeme", "ADP">;

/** Two-way preposition: the construction supplies the case. */
export const aufLemma = adposition("auf");
/** Fixed-case preposition. */
export const fuerLemma = adposition("für");

export const wartenReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "warten",
		coreFeatures: {
			hasSepPrefix: null,
			lexicallyReflexive: null,
			verbType: null,
		},
	},
	emojiDescription: "⏳",
} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
