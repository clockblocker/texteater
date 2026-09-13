import type * as Dumling from "dumling/types";

import {
	hebrewKatavLemma,
	hebrewShanaLemma,
	hebrewUsAbbreviationLemma,
} from "./lemmas";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuPastThirdPluralInflectionSurface = {
	unitKind: "Surface" as const,
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

	lemma: hebrewKatavLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"he", "Lexeme", "VERB">;

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuAttestedInflectionSurface = {
	unitKind: "Surface" as const,
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

	lemma: hebrewKatavLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"he", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "he",
	normalizedSurface: "שנה",

	lemma: hebrewShanaLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"he", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "he",
	normalizedSurface: "ארה״ב",

	lemma: hebrewUsAbbreviationLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Dumling.Surface<"he", "Lexeme", "PROPN">;
