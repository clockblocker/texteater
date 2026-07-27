import type { Surface } from "../../../src";
import {
	hebrewKatavLemma,
	hebrewShanaLemma,
	hebrewUsAbbreviationLemma,
} from "./lemmas";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuResolvedInflectionSurface = {
	inflectionalFeatures: {
		number: "Plur",
		person: "3",
		tense: "Past",
	},
	language: "he",
	normalizedFullSurface: "כתבו",
	surfaceKind: "Inflection",
	lemma: hebrewKatavLemma,
} satisfies Surface<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuUnresolvedInflectionSurface = {
	inflectionalFeatures: {
		number: "Plur",
		person: "3",
		tense: "Past",
	},
	language: "he",
	normalizedFullSurface: "כתבו",
	surfaceKind: "Inflection",
	lemma: hebrewKatavLemma,
} satisfies Surface<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaResolvedLemmaSurface = {
	language: "he",
	normalizedFullSurface: "שנה",
	surfaceKind: "Lemma",
	lemma: hebrewShanaLemma,
} satisfies Surface<"he", "Lemma", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationResolvedLemmaSurface = {
	language: "he",
	normalizedFullSurface: "ארה״ב",
	surfaceKind: "Lemma",
	lemma: hebrewUsAbbreviationLemma,
} satisfies Surface<"he", "Lemma", "Lexeme", "PROPN">;
