import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_ajIP5KV5kzJAhXtQGg" as SegmentedSentenceId,
	clickedSegmentIndex: 12,
	surfaceSegmentIndices: [12],
	attestedSurface: "eingezeichnet",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "eingezeichnet",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "einzeichnen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "ein",
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
	sentenceMarkdown: "Auf der Karte sind drei Seen [eingezeichnet].",
	classifierNotes:
		"Eingezeichnet is treated as the perfect participle of separable einzeichnen. Under the current German rule, attributive participles like eingezeichneten in die eingezeichneten Seen go to ADJ, but this bare predicative Partizip-II form stays VERB despite the result-state reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
