import type { Lemma } from "../../../../src/types";

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
		gender: ["Fem", "Masc"],

		abbr: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Lemma<"he", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
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
