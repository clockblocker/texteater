import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const nuInterjectionSelection = {
	segmentedSentenceId: "sentence_I7y-Qal-YpjmYz92Xm" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "נו",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "נו",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "נו",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: nuInterjectionSelection,
	sentenceMarkdown: "[נו], תספר כבר.",
	classifierNotes:
		"נו is kept as INTJ rather than a discourse formula because it functions as a prompting interjection.",
} as const satisfies AttestedSelection;
