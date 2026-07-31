import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection051 = {
	segmentedSentenceId: "sentence_3q0s7Jv0VZUAzqcCTj" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2, 13],
	attestedSurface: "ge t",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "ge t",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "ge-...-t",
			family: "Morpheme",
			kind: "Circumfix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Morpheme", "Circumfix">;

export const attestation = {
	selection: deSelection051,
	sentenceMarkdown:
		"In [ge]lacht markieren ge- und -t zusammen das Partizip.",
	classifierNotes:
		"The circumfix is modeled as one morpheme even though the selected spelling shows only its first visible segment.",
	isVerified: true,
} as const satisfies AttestedSelection;
