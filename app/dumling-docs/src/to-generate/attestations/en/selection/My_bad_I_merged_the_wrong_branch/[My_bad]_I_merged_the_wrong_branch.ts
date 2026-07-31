import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const myBadFormulaSelection = {
	segmentedSentenceId: "sentence_-V5jdtFvL5ElKYMbbY" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2],
	attestedSurface: "My bad",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "my bad",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "my bad",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Apology",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: myBadFormulaSelection,
	sentenceMarkdown: "[My bad], I merged the wrong branch.",
	classifierNotes:
		"My bad is categorized by discourse function Apology, not by the adjective bad.",
} as const satisfies AttestedSelection;
