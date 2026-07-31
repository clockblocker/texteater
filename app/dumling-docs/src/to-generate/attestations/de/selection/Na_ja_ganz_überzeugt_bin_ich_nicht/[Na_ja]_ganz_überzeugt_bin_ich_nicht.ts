import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection047 = {
	segmentedSentenceId: "sentence_GGqcelQ6g5-qiKZ916" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2],
	attestedSurface: "Na ja",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "na ja",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "na ja",
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
	selection: deSelection047,
	sentenceMarkdown: "[Na ja], ganz überzeugt bin ich nicht.",
	classifierNotes:
		"Na ja is treated as a discourse formula with the role Reaction; punctuation is excluded from the normalized surface.",
} as const satisfies AttestedSelection;
