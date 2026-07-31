import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const tafastaMerubeSelection = {
	segmentedSentenceId: "sentence_fto0ixIkB94Fv9lP-l" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2, 4, 6],
	attestedSurface: "תפסת מרובה לא תפסת",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "תפסת מרובה לא תפסת",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "תפסת מרובה לא תפסת",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	selection: tafastaMerubeSelection,
	sentenceMarkdown: "[תפסת] מרובה לא תפסת.",
	classifierNotes:
		"This is a partial selection against a proverb, not a verb attestation for תפסת.",
} as const satisfies AttestedSelection;
