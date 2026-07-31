import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection054 = {
	segmentedSentenceId: "sentence_xqLp_lkYYRnJqE3nOg" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Am",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "am",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "am",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	selection: deSelection054,
	sentenceMarkdown: "[Am] nächsten Morgen war alles anders.",
	classifierNotes:
		"Am is modeled as Construction/Fusion, parallel to zum and ins. Sentence-initial capitalization is treated as canonical here, and the emoji is for am itself rather than the surrounding temporal phrase.",
	classificationMistakes:
		"Do not mark sentence-initial capitalization alone as a spelling variant. `Am` is a Standard click on a Canonical Surface.",
	isVerified: true,
} as const satisfies AttestedSelection;
