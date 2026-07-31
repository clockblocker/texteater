import type { Surface } from "../../../src";
import {
	hebrewKatavLemma,
	hebrewShanaLemma,
	hebrewUsAbbreviationLemma,
} from "./lemmas";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuPastThirdPluralInflectionSurface = {
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
	surfaceKind: "Inflection",
	lemma: hebrewKatavLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
	realizationCoverage: "Full",
} satisfies Surface<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuAttestedInflectionSurface = {
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
	surfaceKind: "Inflection",
	lemma: hebrewKatavLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
	realizationCoverage: "Full",
} satisfies Surface<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSurface = {
	language: "he",
	normalizedSurface: "שנה",
	surfaceKind: "Citation",
	lemma: hebrewShanaLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
	realizationCoverage: "Full",
} satisfies Surface<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationCitationSurface = {
	language: "he",
	normalizedSurface: "ארה״ב",
	surfaceKind: "Citation",
	lemma: hebrewUsAbbreviationLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
	realizationCoverage: "Full",
} satisfies Surface<"he", "Citation", "Lexeme", "PROPN">;
