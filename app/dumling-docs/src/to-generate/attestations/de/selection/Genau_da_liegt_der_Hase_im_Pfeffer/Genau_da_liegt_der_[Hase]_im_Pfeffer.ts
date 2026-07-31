import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection044 = {
	segmentedSentenceId: "sentence_aLRJpS_aIYm7x1r1zk" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [2, 4, 6, 8, 10, 12],
	attestedSurface: "da liegt der Hase im Pfeffer",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "da liegt der hase im pfeffer",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "da liegt der Hase im Pfeffer",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection044,
	sentenceMarkdown: "Genau da liegt der [Hase] im Pfeffer.",
	classifierNotes:
		"This is a partial selection inside an opaque idiom; the selected token is not classified as the lexical noun Hase.",
	isVerified: true,
} as const satisfies AttestedSelection;
