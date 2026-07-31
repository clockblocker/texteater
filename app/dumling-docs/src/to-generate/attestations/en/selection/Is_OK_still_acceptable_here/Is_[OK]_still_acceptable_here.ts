import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const okVariantSelection = {
	segmentedSentenceId: "sentence_i8ar0bQO1a7zXqRKBE" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "OK",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "OK",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "okay",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				polarity: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: okVariantSelection,
	sentenceMarkdown: "Is [OK] still acceptable here?",
	classifierNotes:
		"OK is treated as a standard spelling variant of the canonical lemma okay.",
} as const satisfies AttestedSelection;
