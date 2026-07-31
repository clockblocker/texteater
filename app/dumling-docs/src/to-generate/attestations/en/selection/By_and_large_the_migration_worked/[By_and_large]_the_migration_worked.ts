import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const byAndLargeIdiomSelection = {
	segmentedSentenceId: "sentence_xztlu_Abq9IEnLf7Gi" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2, 4],
	attestedSurface: "By and large",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "by and large",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "by and large",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: byAndLargeIdiomSelection,
	sentenceMarkdown: "[By and large], the migration worked.",
	classifierNotes:
		"Sentence-initial capitalization is preserved only in clicked Text.",
} as const satisfies AttestedSelection;
