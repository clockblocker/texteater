import type { Selection } from "../../../../src/types";
import {
	hebrewKatvuInflectionSurface,
	hebrewShanaCitationSurface,
	hebrewUsAbbreviationCitationSurface,
} from "./surfaces";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuStandardFullSelection = {
	language: "he",
	spelledSelection: "כתבו",

	surface: hebrewKatvuInflectionSurface,

	selectionFeatures: null,
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSelection = {
	language: "he",
	spelledSelection: "שנה",

	surface: hebrewShanaCitationSurface,

	selectionFeatures: null,
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationSelection = {
	language: "he",
	spelledSelection: "ארה״ב",

	surface: hebrewUsAbbreviationCitationSurface,

	selectionFeatures: null,
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

// Attestation: "הם [כָּתְבוּ] מכתב."
export const hebrewKatvuPointedVariantSelection = {
	language: "he",
	selectionFeatures: {
		spelling: "Variant",
		coverage: null,
		orthography: null,
	},
	spelledSelection: "כָּתְבוּ",

	surface: {
		...hebrewKatvuInflectionSurface,
		normalizedFullSurface: "כָּתְבוּ",

		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;
