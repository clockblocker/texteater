import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const ishSuffixPartialSelection = {
	segmentedSentenceId: "sentence_x5bwKW9s1wvqgs5TcY" as SegmentedSentenceId,
	clickedSegmentIndex: 7,
	surfaceSegmentIndices: [7],
	attestedSurface: "ish",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "ish",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "-ish",
			family: "Morpheme",
			kind: "Suffix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Suffix">;

export const attestation = {
	selection: ishSuffixPartialSelection,
	sentenceMarkdown: "The estimate was thirty[ish] minutes.",
	classifierNotes:
		"The suffix citation includes a leading hyphen, while the attested substring omits it.",
} as const satisfies AttestedSelection;
