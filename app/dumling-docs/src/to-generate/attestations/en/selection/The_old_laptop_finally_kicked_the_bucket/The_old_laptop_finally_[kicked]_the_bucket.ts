import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const kickTheBucketPartialIdiomSelection = {
	segmentedSentenceId: "sentence_gTmrGuO-rLyVxL8Smw" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8, 10, 12],
	attestedSurface: "kicked the bucket",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "kicked the bucket",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "kick the bucket",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: kickTheBucketPartialIdiomSelection,
	sentenceMarkdown: "The old laptop finally [kicked] the bucket.",
	classifierNotes:
		"The literal verb is inflected in the sentence, but the idiom entry stays citation-form only.",
} as const satisfies AttestedSelection;
