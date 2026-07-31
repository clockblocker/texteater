import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const telechNegativeSelection = {
	segmentedSentenceId: "sentence_JFtPA8Ee2kq3-PtuZm" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "תלך",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "תלך",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "2",
			polarity: "Neg",
			tense: "Fut",
			definite: null,
			mood: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "הלך",
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
	selection: telechNegativeSelection,
	sentenceMarkdown: "אל [תלך] לבד.",
	classifierNotes:
		"The verb carries polarity Neg because the negative-command context matters even though אל is separate.",
} as const satisfies AttestedSelection;
