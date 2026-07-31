import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_nlIYGNsh2dTsr3Hmki" as SegmentedSentenceId,
	clickedSegmentIndex: 23,
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
da rief die Frau: »[O] wei! O wei!«`,
	classifierNotes:
		"I linked the selected O to the whole exclamation o wei as a discourse formula, not to a standalone interjection token. That follows the dumling preference for preserving the meaning-bearing multiword formula when a learner highlights only one part of it.",
	isVerified: true,
} as const satisfies AttestedSelection;
