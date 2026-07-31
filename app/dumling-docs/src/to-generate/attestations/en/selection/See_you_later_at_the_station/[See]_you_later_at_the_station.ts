import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const seeYouLaterFormulaPartialSelection = {
	segmentedSentenceId: "sentence_Gjlc4dcMniQi7bbArN" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2, 4],
	attestedSurface: "See you later",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "see you later",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "see you later",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Farewell",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: seeYouLaterFormulaPartialSelection,
	sentenceMarkdown: "[See] you later at the station.",
	classifierNotes:
		"Only See is selected, but the intended formula is see you later.",
} as const satisfies AttestedSelection;
