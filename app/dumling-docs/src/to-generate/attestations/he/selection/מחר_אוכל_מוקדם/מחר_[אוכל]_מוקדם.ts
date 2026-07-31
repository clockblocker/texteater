import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const ochalVerbSelection = {
	segmentedSentenceId: "sentence_GF8y3HwMn5LfHObFAH" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "אוכל",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "אוכל",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
			person: "1",
			tense: "Fut",
			definite: null,
			gender: null,
			mood: null,
			polarity: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "אכל",
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
	selection: ochalVerbSelection,
	sentenceMarkdown: "מחר [אוכל] מוקדם.",
	classifierNotes:
		"אוכל is the future first-person verb from אכל, separated from the noun homograph.",
} as const satisfies AttestedSelection;
