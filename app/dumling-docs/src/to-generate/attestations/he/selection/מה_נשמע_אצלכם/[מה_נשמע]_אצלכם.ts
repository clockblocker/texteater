import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const maNishmaFormulaSelection = {
	segmentedSentenceId: "sentence_uRjgaWkeXqv2DgTUkb" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2],
	attestedSurface: "מה נשמע",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "מה נשמע",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "מה נשמע",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: maNishmaFormulaSelection,
	sentenceMarkdown: "[מה נשמע] אצלכם?",
	classifierNotes:
		"The multiword greeting is modeled as one discourse-formula surface.",
} as const satisfies AttestedSelection;
