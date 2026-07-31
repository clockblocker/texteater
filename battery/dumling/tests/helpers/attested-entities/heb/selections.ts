import type { SegmentedSentenceId, Selection } from "../../../../src/types";
import {
	hebrewKatvuInflectionSurface,
	hebrewShanaCitationSurface,
	hebrewUsAbbreviationCitationSurface,
} from "./surfaces";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuStandardFullSelection = {
	segmentedSentenceId: "test:he:hem-katvu-michtav:v1" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "כתבו",
	selectedOrthography: "Standard",
	surface: hebrewKatvuInflectionSurface,
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSelection = {
	segmentedSentenceId: "test:he:od-shana-avra:v1" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "שנה",
	selectedOrthography: "Standard",
	surface: hebrewShanaCitationSurface,
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationSelection = {
	segmentedSentenceId: "test:he:us-announcement:v1" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "ארה״ב",
	selectedOrthography: "Standard",
	surface: hebrewUsAbbreviationCitationSurface,
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

// Attestation: "הם [כָּתְבוּ] מכתב."
export const hebrewKatvuPointedVariantSelection = {
	segmentedSentenceId:
		"test:he:hem-katvu-pointed-michtav:v1" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "כָּתְבוּ",
	selectedOrthography: "Standard",
	surface: {
		...hebrewKatvuInflectionSurface,
		normalizedSurface: "כָּתְבוּ",
		spelling: "Variant",
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;
