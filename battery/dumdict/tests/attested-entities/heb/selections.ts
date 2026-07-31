import { dumling, type Selection } from "../../../src";
import {
	hebrewKatvuAttestedInflectionSurface,
	hebrewShanaCitationSurface,
	hebrewUsAbbreviationCitationSurface,
} from "./surfaces";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuStandardFullSelection = {
	segmentedSentenceId: dumling.he.create.segmentedSentenceId(
		"test:hebrewKatvuStandardFullSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "כתבו",
	surface: hebrewKatvuAttestedInflectionSurface,
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

// Attestation: "עוד [שנה] עברה."
export const hebrewShanaCitationSelection = {
	segmentedSentenceId: dumling.he.create.segmentedSentenceId(
		"test:hebrewShanaCitationSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "שנה",
	surface: hebrewShanaCitationSurface,
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

// Attestation: "[ארה״ב] הודיעה על צעד חדש."
export const hebrewUsAbbreviationSelection = {
	segmentedSentenceId: dumling.he.create.segmentedSentenceId(
		"test:hebrewUsAbbreviationSelection",
	),
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	selectedOrthography: "Standard",
	attestedSurface: "ארה״ב",
	surface: hebrewUsAbbreviationCitationSurface,
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

// Attestation: "הם [כָּתְבוּ] מכתב."
export const hebrewKatvuPointedVariantSelection = {
	segmentedSentenceId: dumling.he.create.segmentedSentenceId(
		"test:hebrewKatvuPointedVariantSelection",
	),
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
	attestedSurface: "כָּתְבוּ",
	surface: {
		...hebrewKatvuAttestedInflectionSurface,
		normalizedSurface: "כָּתְבוּ",
		spelling: "Variant",
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;
