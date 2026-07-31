import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const nichtavVerbSelection = {
	segmentedSentenceId: "sentence_P198tDtpx_A4VeSVe0" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "נכתב",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "נכתב",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "3",
			tense: "Past",
			voice: "Pass",
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
				hebBinyan: "NIFAL",
				hebExistential: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: nichtavVerbSelection,
	sentenceMarkdown: 'הדו"ח [נכתב] אתמול.',
	classifierNotes:
		"נכתב is the NIFAL passive-like form, so it carries voice Pass.",
} as const satisfies AttestedSelection;
