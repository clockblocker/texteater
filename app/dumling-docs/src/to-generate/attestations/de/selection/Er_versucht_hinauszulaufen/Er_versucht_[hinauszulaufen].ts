import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_g2BWy2sB3y9nBi24nC" as SegmentedSentenceId,
	clickedSegmentIndex: 5,
	surfaceSegmentIndices: [5],
	attestedSurface: "hinauszulaufen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "hinauszulaufen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Inf",
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "hinauslaufen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "hinaus",
				hasGovPrep: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Er versucht, [hinauszulaufen].",
	classifierNotes:
		"The infinitive spelling `hinauszulaufen` directly exposes the separable verb lemma `hinauslaufen`, so this is an unambiguous verbal inflection rather than a standalone directional adverb.",
	isVerified: true,
} as const satisfies AttestedSelection;
