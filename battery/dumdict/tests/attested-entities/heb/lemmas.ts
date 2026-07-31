import type { Lemma } from "../../../src";

// Attestation: "הוא [כתב] מכתב."
export const hebrewKatavLemma = {
	canonicalForm: "כתב",
	coreFeatures: {
		hebBinyan: "PAAL",
		hebExistential: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"he", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaLemma = {
	canonicalForm: "שנה",
	coreFeatures: {
		gender: "Fem",
		abbr: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Lemma<"he", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
// UD-style: multi-word abbreviations keep the abbreviated form as canonicalForm and mark Abbr=Yes.
// See https://universaldependencies.org/u/overview/morphology.html
export const hebrewUsAbbreviationLemma = {
	canonicalForm: "ארה״ב",
	coreFeatures: {
		abbr: "Yes",
		gender: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "PROPN",
} satisfies Lemma<"he", "Lexeme", "PROPN">;
