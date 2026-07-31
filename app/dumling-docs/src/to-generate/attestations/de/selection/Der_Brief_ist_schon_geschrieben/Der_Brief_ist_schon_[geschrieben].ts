import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_sbLfPefNKN5ZSaSSYs" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "geschrieben",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "geschrieben",
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
			canonicalForm: "schreiben",
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
	sentenceMarkdown: "Der Brief ist schon [geschrieben].",
	classifierNotes:
		"Geschrieben is a bare predicative Partizip-II form of schreiben. Under the current German verb rule, non-attributive participles of lexical verbs stay VERB rather than shifting to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
