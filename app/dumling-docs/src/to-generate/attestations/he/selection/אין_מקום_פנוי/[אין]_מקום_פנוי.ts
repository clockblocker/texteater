import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const einExistentialSelection = {
	segmentedSentenceId: "sentence_tvfOGNGeomuY9EyyIh" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "אין",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "אין",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "אין",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebExistential: "Yes",
				hebBinyan: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: einExistentialSelection,
	sentenceMarkdown: "[אין] מקום פנוי.",
	classifierNotes:
		"אין is the negative existential verb; its negativity is lexical here, not an inflectional polarity feature.",
} as const satisfies AttestedSelection;
