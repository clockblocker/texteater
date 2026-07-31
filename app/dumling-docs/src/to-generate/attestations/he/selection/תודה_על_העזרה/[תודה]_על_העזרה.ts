import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const todaFormulaSelection = {
	segmentedSentenceId: "sentence_zITBcP65ZJJTtDPgQM" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "תודה",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "תודה",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "תודה",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: todaFormulaSelection,
	sentenceMarkdown: "[תודה] על העזרה.",
	classifierNotes:
		"תודה is treated as a thanks formula rather than as a standalone noun.",
} as const satisfies AttestedSelection;
