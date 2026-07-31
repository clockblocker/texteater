import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_PSkpkb2n-Va_On7hrB" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "verheiratet",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "verheiratet",
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
			canonicalForm: "verheiraten",
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
	sentenceMarkdown: "Sie ist [verheiratet].",
	classifierNotes:
		"Verheiratet is treated here as a bare predicative Partizip-II form of verheiraten. Under the stricter German participle rule, non-attributive participles of lexical verbs stay VERB even when the clause expresses a stable resulting state.",
	isVerified: true,
} as const satisfies AttestedSelection;
