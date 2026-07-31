import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const bateiConstructSelection = {
	segmentedSentenceId: "sentence_P-2V-8J4Cb2hAg1tWG" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "בתי",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "בתי",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Cons",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalForm: "בית",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: bateiConstructSelection,
	sentenceMarkdown: "[בתי] הספר נסגרו מוקדם.",
	classifierNotes:
		"בתי is the construct plural of בית, using definite Cons and number Plur.",
} as const satisfies AttestedSelection;
