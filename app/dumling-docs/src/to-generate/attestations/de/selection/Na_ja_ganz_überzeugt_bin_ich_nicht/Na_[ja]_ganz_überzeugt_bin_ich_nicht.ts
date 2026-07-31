import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_GGqcelQ6g5-qiKZ916" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
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
	selection: deSelection,
	sentenceMarkdown: "Na [ja], ganz überzeugt bin ich nicht.",
	classifierNotes:
		"I treated the selected ja as part of the larger discourse formula na ja, so this is a Partial selection of the phraseme rather than a standalone response particle.",
	isVerified: true,
} as const satisfies AttestedSelection;
