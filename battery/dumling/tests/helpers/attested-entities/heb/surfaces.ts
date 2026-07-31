import type { Surface } from "../../../../src/types";
import {
	hebrewKatavLemma,
	hebrewShanaLemma,
	hebrewUsAbbreviationLemma,
} from "./lemmas";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuInflectionSurface = {
	inflectionalFeatures: {
		number: "Plur",
		person: "3",
		tense: "Past",

		voice: null,
		verbForm: null,
		polarity: null,
		mood: null,
		gender: null,
		definite: null,
	},
	language: "he",
	normalizedSurface: "כתבו",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Inflection",
	lemma: hebrewKatavLemma,

	surfaceFeatures: null,
} satisfies Surface<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSurface = {
	language: "he",
	normalizedSurface: "שנה",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Citation",
	lemma: hebrewShanaLemma,

	surfaceFeatures: null,
} satisfies Surface<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationCitationSurface = {
	language: "he",
	normalizedSurface: "ארה״ב",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Citation",
	lemma: hebrewUsAbbreviationLemma,

	surfaceFeatures: null,
} satisfies Surface<"he", "Citation", "Lexeme", "PROPN">;
