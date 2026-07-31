import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const katvaVerbSelection = {
	segmentedSentenceId: "sentence_olb3yJOaEb0BF0XV0F" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "כתבה",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "כתבה",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			person: "3",
			tense: "Past",
			definite: null,
			mood: null,
			polarity: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "כתב",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebBinyan: "PAAL",
				hebExistential: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: katvaVerbSelection,
	sentenceMarkdown: "היא [כתבה] מכתב קצר.",
	classifierNotes:
		"כתבה is the past feminine-singular verb from כתב despite the homographic noun article.",
} as const satisfies AttestedSelection;
