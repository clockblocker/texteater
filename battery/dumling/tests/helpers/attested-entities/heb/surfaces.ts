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
	},
	language: "he",
	normalizedFullSurface: "כתבו",
	surfaceKind: "Inflection",
	lemma: hebrewKatavLemma,
} satisfies Surface<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSurface = {
	language: "he",
	normalizedFullSurface: "שנה",
	surfaceKind: "Citation",
	lemma: hebrewShanaLemma,
} satisfies Surface<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationCitationSurface = {
	language: "he",
	normalizedFullSurface: "ארה״ב",
	surfaceKind: "Citation",
	lemma: hebrewUsAbbreviationLemma,
} satisfies Surface<"he", "Citation", "Lexeme", "PROPN">;
