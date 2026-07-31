import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const bvgAbbreviationSelection = {
	segmentedSentenceId: "sentence_I2J_J3figIzm4BvN7e" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "BVG",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "BVG",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "BVG",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				abbr: "Yes",
				foreign: null,
				gender: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	selection: bvgAbbreviationSelection,
	sentenceMarkdown: "In Berlin betreibt die [BVG] die U-Bahn.",
	classifierNotes:
		'`BVG` is a proper-noun abbreviation, so `abbr: "Yes"` belongs on the Lemma\'s inherent feature bag.',
} as const satisfies AttestedSelection;
