import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const hasfarimSelection = {
	segmentedSentenceId: "sentence_hx1b-nkRHmAWQZQMX4" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "הספרים",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "הספרים",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalForm: "ספר",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: hasfarimSelection,
	sentenceMarkdown: "[הספרים] על השולחן.",
	classifierNotes:
		"This is a full selection of a definite plural noun surface.",
} as const satisfies AttestedSelection;
