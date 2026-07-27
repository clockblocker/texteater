import type { Selection } from "../../../src";
import {
	hebrewKatvuUnresolvedInflectionSurface,
	hebrewShanaResolvedLemmaSurface,
	hebrewUsAbbreviationResolvedLemmaSurface,
} from "./surfaces";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuStandardFullSelection = {
	language: "he",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "כתבו",
	spellingRelation: "Canonical",
	surface: hebrewKatvuUnresolvedInflectionSurface,
} satisfies Selection<"he", "Standard", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaResolvedLemmaSelection = {
	language: "he",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "שנה",
	spellingRelation: "Canonical",
	surface: hebrewShanaResolvedLemmaSurface,
} satisfies Selection<"he", "Standard", "Lemma", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationSelection = {
	language: "he",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "ארה״ב",
	spellingRelation: "Canonical",
	surface: hebrewUsAbbreviationResolvedLemmaSurface,
} satisfies Selection<"he", "Standard", "Lemma", "Lexeme", "PROPN">;

// Attestation: "הם [כָּתְבוּ] מכתב."
export const hebrewKatvuPointedVariantSelection = {
	language: "he",
	orthographicStatus: "Standard",
	selectionCoverage: "Full",
	spelledSelection: "כָּתְבוּ",
	spellingRelation: "Variant",
	surface: {
		...hebrewKatvuUnresolvedInflectionSurface,
		normalizedFullSurface: "כָּתְבוּ",
	},
} satisfies Selection<"he", "Standard", "Inflection", "Lexeme", "VERB">;
