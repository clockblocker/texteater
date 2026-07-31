import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const shelGenitiveSelection = {
	segmentedSentenceId: "sentence_C6yDqgF-6HIlEsK2Du" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "של",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "של",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "של",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				case: "Gen",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: shelGenitiveSelection,
	sentenceMarkdown: "הספר [של] נועה נשאר כאן.",
	classifierNotes: "של is the genitive relation marker here, modeled as ADP.",
} as const satisfies AttestedSelection;
