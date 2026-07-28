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
	normalizedFullSurface: "כתבו",
	surfaceKind: "Inflection",
	lemma: hebrewKatavLemma,

	surfaceFeatures: null,
} satisfies Surface<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSurface = {
	language: "he",
	normalizedFullSurface: "שנה",
	surfaceKind: "Citation",
	lemma: hebrewShanaLemma,

	surfaceFeatures: null,
} satisfies Surface<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationCitationSurface = {
	language: "he",
	normalizedFullSurface: "ארה״ב",
	surfaceKind: "Citation",
	lemma: hebrewUsAbbreviationLemma,

	surfaceFeatures: null,
} satisfies Surface<"he", "Citation", "Lexeme", "PROPN">;
