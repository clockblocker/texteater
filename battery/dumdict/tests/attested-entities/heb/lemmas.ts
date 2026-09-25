import type * as Dumling from "dumling/types";

// Attestation: "הוא [כתב] מכתב."
export const hebrewKatavLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "כתב",
	coreFeatures: {
		hebBinyan: "PAAL",
		hebExistential: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"he", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "שנה",
	coreFeatures: {
		gender: "Fem",
		abbr: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Dumling.Lemma<"he", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
// UD-style: multi-word abbreviations keep the abbreviated form as canonicalForm and mark Abbr=Yes.
// See https://universaldependencies.org/u/overview/morphology.html
export const hebrewUsAbbreviationLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "ארה״ב",
	coreFeatures: {
		abbr: "Yes",
		article: null,
		gender: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "PROPN",
} satisfies Dumling.Lemma<"he", "Lexeme", "PROPN">;
