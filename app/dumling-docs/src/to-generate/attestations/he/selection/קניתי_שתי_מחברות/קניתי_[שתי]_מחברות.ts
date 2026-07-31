import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const shteiNumeralSelection = {
	segmentedSentenceId: "sentence_nFZ5yBE0seRxFzuipm" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "שתי",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "שתי",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Cons",
			gender: "Fem",
			number: "Dual",
		},
		lemma: {
			language: "he",
			canonicalForm: "שתיים",
			family: "Lexeme",
			kind: "NUM",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NUM">;

export const attestation = {
	selection: shteiNumeralSelection,
	sentenceMarkdown: "קניתי [שתי] מחברות.",
	classifierNotes:
		"שתי is the construct or feminine form of שתיים and is intentionally awkward for feature-boundary testing.",
} as const satisfies AttestedSelection;
