import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_eHsbq0u5G6ZSxJFuVm" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "geschlossen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "geschlossen",
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
			canonicalForm: "schließen",
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
	sentenceMarkdown: "Die Tür ist [geschlossen].",
	classifierNotes:
		"Geschlossen is treated here as a bare predicative Partizip-II form of schließen. Under the stricter German participle rule, non-attributive participles of lexical verbs stay VERB even when the clause describes a resulting state.",
	isVerified: true,
} as const satisfies AttestedSelection;
