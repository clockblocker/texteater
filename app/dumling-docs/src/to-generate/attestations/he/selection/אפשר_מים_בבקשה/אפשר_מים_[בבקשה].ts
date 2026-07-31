import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const bevakashaFormulaSelection = {
	segmentedSentenceId: "sentence_Ox9Xd6p51wpBmhiNR-" as SegmentedSentenceId,
	clickedSegmentIndex: 5,
	surfaceSegmentIndices: [5],
	attestedSurface: "בבקשה",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "בבקשה",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "בבקשה",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: bevakashaFormulaSelection,
	sentenceMarkdown: "אפשר מים, [בבקשה]?",
	classifierNotes:
		"בבקשה is treated as a request politeness formula despite containing the noun בקשה.",
} as const satisfies AttestedSelection;
