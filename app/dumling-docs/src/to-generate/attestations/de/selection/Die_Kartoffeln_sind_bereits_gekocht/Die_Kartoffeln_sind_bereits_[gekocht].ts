import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_ekfmEG3OV-4zqO3hhp" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "gekocht",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "gekocht",
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
			canonicalForm: "kochen",
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
	sentenceMarkdown: "Die Kartoffeln sind bereits [gekocht].",
	classifierNotes:
		"Gekocht is a bare predicative Partizip-II form of kochen. Even though the clause describes a resulting state, the current German participle rule keeps non-attributive participles of lexical verbs under VERB rather than shifting them to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
