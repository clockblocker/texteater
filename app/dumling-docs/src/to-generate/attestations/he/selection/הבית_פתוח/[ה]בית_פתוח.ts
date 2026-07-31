import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const haDeterminerSelection = {
	segmentedSentenceId: "sentence_S48kV_rGl5eLndpB2F" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "ה",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "ה",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ה",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				pronType: "Art",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "DET">;

export const attestation = {
	selection: haDeterminerSelection,
	sentenceMarkdown: "[ה]בית פתוח.",
	classifierNotes:
		"The standalone article is modeled as DET with pronType Art, not as a noun definiteness feature.",
} as const satisfies AttestedSelection;
