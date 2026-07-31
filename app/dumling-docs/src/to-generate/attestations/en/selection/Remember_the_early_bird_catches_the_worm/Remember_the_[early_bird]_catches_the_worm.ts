import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const earlyBirdProverbPartialSelection = {
	segmentedSentenceId: "sentence_5IC-DHAGLIh_JPaQMK" as SegmentedSentenceId,
	clickedSegmentIndex: 5,
	surfaceSegmentIndices: [3, 5, 7, 9, 11, 13],
	attestedSurface: "the early bird catches the worm",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "the early bird catches the worm",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "the early bird catches the worm",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	selection: earlyBirdProverbPartialSelection,
	sentenceMarkdown: "Remember, the [early bird] catches the worm.",
	classifierNotes:
		"Partial proverb selection tests whether the model recovers the full proverb from a salient fragment.",
} as const satisfies AttestedSelection;
