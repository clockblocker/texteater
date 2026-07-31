import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const noWorriesFormulaSelection = {
	segmentedSentenceId: "sentence_Lv4D00_mEusniYUwFn" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2],
	attestedSurface: "No worries",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "no worries",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "no worries",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Acknowledgment",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: noWorriesFormulaSelection,
	sentenceMarkdown: "[No worries], I already fixed it.",
	classifierNotes:
		"No worries is a discourse formula rather than compositional negation plus noun.",
} as const satisfies AttestedSelection;
