import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const walkInTheParkSelection = {
	segmentedSentenceId: "sentence_bn6eNf8fxZ5IQBSAkI" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8, 10, 12, 14],
	attestedSurface: "walk in the park",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "walk in the park",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "walk in the park",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: walkInTheParkSelection,
	sentenceMarkdown: "This exam was a [walk] in the park.",
} as const satisfies AttestedSelection;
