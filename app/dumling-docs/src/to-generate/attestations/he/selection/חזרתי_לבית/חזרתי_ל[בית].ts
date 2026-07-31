import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const habayitPartialSelection = {
	segmentedSentenceId: "sentence_Dt7P81zWbu12j8Oru4" as SegmentedSentenceId,
	clickedSegmentIndex: 3,
	surfaceSegmentIndices: [3],
	attestedSurface: "בית",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "בית",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			number: null,
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
	selection: habayitPartialSelection,
	sentenceMarkdown: "חזרתי ל[בית].",
	classifierNotes:
		"בית is a partial selection against a definite noun surface; the omitted article still drives definite Def.",
} as const satisfies AttestedSelection;
