import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const yeshExistentialSelection = {
	segmentedSentenceId: "sentence_kExxXHPdBSNe10DP0m" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "יש",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "יש",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "יש",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebExistential: "Yes",
				hebBinyan: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: yeshExistentialSelection,
	sentenceMarkdown: "[יש] קפה במטבח.",
	classifierNotes:
		"יש is modeled as an existential verb, not as an adverb or particle.",
} as const satisfies AttestedSelection;
