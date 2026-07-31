import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const boUImperativeSelection = {
	segmentedSentenceId: "sentence_lf_ogzx6FOvszUPkC6" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "בואו",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "בואו",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Plur",
			person: "2",
			definite: null,
			gender: null,
			polarity: null,
			tense: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "בוא",
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
	selection: boUImperativeSelection,
	sentenceMarkdown: "[בואו] לכאן.",
	classifierNotes:
		"בואו is an imperative plural form with mood Imp and no tense.",
} as const satisfies AttestedSelection;
