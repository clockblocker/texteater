import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const katavVerbSelection = {
	segmentedSentenceId: "sentence_LMbBZu3UiQBPFVZnNL" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "כתב",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "כתב",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
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
	selection: katavVerbSelection,
	sentenceMarkdown: "הוא [כתב] מהר.",
	classifierNotes:
		"כתב is the verb inflection here, distinct from both the root morpheme and noun-like uses.",
} as const satisfies AttestedSelection;
