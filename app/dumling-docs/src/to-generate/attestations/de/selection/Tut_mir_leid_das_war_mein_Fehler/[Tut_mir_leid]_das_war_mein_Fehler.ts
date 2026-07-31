import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection049 = {
	segmentedSentenceId: "sentence_PFqS8WIv2GhhkdX5PY" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2, 4],
	attestedSurface: "Tut mir leid",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "tut mir leid",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "tut mir leid",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Apology",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: deSelection049,
	sentenceMarkdown: "[Tut mir leid], das war mein Fehler.",
	classifierNotes:
		"Tut mir leid is stored as an apology phraseme, not as a literal finite-verb selection.",
	isVerified: true,
} as const satisfies AttestedSelection;
