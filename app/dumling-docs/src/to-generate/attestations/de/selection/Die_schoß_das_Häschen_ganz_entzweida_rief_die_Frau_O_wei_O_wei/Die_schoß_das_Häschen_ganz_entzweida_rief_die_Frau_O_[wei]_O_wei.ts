import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_nlIYGNsh2dTsr3Hmki" as SegmentedSentenceId,
	clickedSegmentIndex: 25,
	surfaceSegmentIndices: [23, 25],
	attestedSurface: "O wei",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "o wei",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "o wei",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Reaction",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die schoß das Häschen ganz entzwei;
da rief die Frau: »O [wei]! O wei!«`,
	classifierNotes:
		"This is the same reaction formula analysis as the O selection: wei is treated as a partial slice of the discourse formula o wei, not as an independent lexeme.",
	isVerified: true,
} as const satisfies AttestedSelection;
