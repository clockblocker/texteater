import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const bePrefixSelection = {
	segmentedSentenceId: "sentence_J0qW90WE_HzrucMZBj" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "ב",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "ב",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ב",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: bePrefixSelection,
	sentenceMarkdown: "הם נפגשו [ב]בית.",
	classifierNotes:
		"ב is treated as a prefix morpheme even though it corresponds semantically to a preposition.",
} as const satisfies AttestedSelection;
