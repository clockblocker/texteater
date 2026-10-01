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
	coreFeatures: { abbr: null, article: null, gender: "Neut" },
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
		coreFeatures: { abbr: null },
	}) as const satisfies Dumling.Lemma<"de", "Lexeme", "ADP">;

/** Two-way preposition: the construction supplies the case. */
export const aufLemma = adposition("auf");
/** Fixed-case preposition. */
export const fuerLemma = adposition("für");
/** Governed by `grauen` with Dat: `mir graut vor dem Winter`. */
export const vorLemma = adposition("vor");
/** `reden über` + Acc, an alternative to `reden von` + Dat. */
export const ueberLemma = adposition("über");
/** `reden von` + Dat, an alternative to `reden über` + Acc. */
export const vonLemma = adposition("von");
/** `reden mit` + Dat, which can appear beside `über` and takes its own Slot. */
export const mitLemma = adposition("mit");

/** Hebrew preposition: Hebrew complements mark no case. */
export const alLemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm: "על",
	coreFeatures: { abbr: null, case: null },
} as const satisfies Dumling.Lemma<"he", "Lexeme", "ADP">;

/** English preposition: English complements mark no case either. */
export const onLemma = {
	unitKind: "Lemma",
	language: "en",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm: "on",
	coreFeatures: { abbr: null, extPos: null },
} as const satisfies Dumling.Lemma<"en", "Lexeme", "ADP">;

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
