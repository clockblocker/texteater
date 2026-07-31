import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection041 = {
	segmentedSentenceId: "sentence_COXPWx2k5UCZQa2rdj" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "nicht",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "nicht",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "nicht",
			family: "Lexeme",
			kind: "PART",
			coreFeatures: {
				polarity: "Neg",
				abbr: null,
				foreign: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "PART">;

export const attestation = {
	selection: deSelection041,
	sentenceMarkdown: "Das ist [nicht] mein Problem.",
	classifierNotes:
		"Nicht is modeled as PART with polarity Neg rather than as an adverb.",
	isVerified: true,
} as const satisfies AttestedSelection;
