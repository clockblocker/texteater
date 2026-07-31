import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const hatovotAdjectiveSelection = {
	segmentedSentenceId: "sentence_UbfPrHSmH3iS1hOk4R" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "הטובות",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "הטובות",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			gender: "Fem",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalForm: "טוב",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: hatovotAdjectiveSelection,
	sentenceMarkdown: "השאלות [הטובות] נשארו לסוף.",
	classifierNotes:
		"הטובות is a definite feminine plural adjective surface that preserves article agreement.",
} as const satisfies AttestedSelection;
