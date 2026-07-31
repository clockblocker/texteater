import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const shalomFormulaSelection = {
	segmentedSentenceId: "sentence__h_GBaqdLPo8Ye4EHa" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "שלום",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "שלום",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "שלום",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: shalomFormulaSelection,
	sentenceMarkdown: "[שלום], מה שלומך?",
	classifierNotes:
		"שלום is treated as a discourse formula rather than as the noun peace because the sentence is a greeting.",
} as const satisfies AttestedSelection;
