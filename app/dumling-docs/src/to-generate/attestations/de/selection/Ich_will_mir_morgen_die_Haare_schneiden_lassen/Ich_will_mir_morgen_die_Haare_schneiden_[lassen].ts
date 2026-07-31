import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_iVtVklUVfNcC8J51ze" as SegmentedSentenceId,
	clickedSegmentIndex: 14,
	surfaceSegmentIndices: [14],
	attestedSurface: "lassen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "lassen",
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
			canonicalForm: "lassen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Ich will mir morgen die Haare schneiden [lassen].",
	classifierNotes:
		"The selected token is the plain infinitive of the lexical verb lassen in a causative construction, not a citation form standing outside syntax.",
	isVerified: true,
} as const satisfies AttestedSelection;
