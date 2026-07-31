import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const chasVechalilaIdiomSelection = {
	segmentedSentenceId: "sentence_kLkHCjxG97aBS-wP8S" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2],
	attestedSurface: "חס וחלילה",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "חס וחלילה",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "חס וחלילה",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: chasVechalilaIdiomSelection,
	sentenceMarkdown: "[חס וחלילה] שנאחר שוב.",
	classifierNotes:
		"חס וחלילה is treated as an idiom because the literal pieces are not the learner-facing meaning.",
} as const satisfies AttestedSelection;
