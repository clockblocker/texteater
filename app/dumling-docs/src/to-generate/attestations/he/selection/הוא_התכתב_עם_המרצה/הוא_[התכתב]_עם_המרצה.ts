import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const hitkatevVerbSelection = {
	segmentedSentenceId: "sentence_FOMi8NVjJHE3qs2Bk4" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "התכתב",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "התכתב",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "3",
			tense: "Past",
			voice: "Mid",
			definite: null,
			mood: null,
			polarity: null,
			verbForm: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "כתב",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebBinyan: "HITPAEL",
				hebExistential: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: hitkatevVerbSelection,
	sentenceMarkdown: "הוא [התכתב] עם המרצה.",
	classifierNotes:
		"התכתב is analyzed as HITPAEL with voice Mid to expose reflexive or reciprocal middle behavior.",
} as const satisfies AttestedSelection;
