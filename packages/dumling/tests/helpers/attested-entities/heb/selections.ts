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
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSelection = {
	language: "he",
	spelledSelection: "שנה",

	surface: hebrewShanaCitationSurface,
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationSelection = {
	language: "he",
	spelledSelection: "ארה״ב",

	surface: hebrewUsAbbreviationCitationSurface,
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

// Attestation: "הם [כָּתְבוּ] מכתב."
export const hebrewKatvuPointedVariantSelection = {
	language: "he",
	selectionFeatures: { spelling: "Variant" },
	spelledSelection: "כָּתְבוּ",

	surface: {
		...hebrewKatvuInflectionSurface,
		normalizedFullSurface: "כָּתְבוּ",
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;
