import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_Zn6hHThd27w5oxzRN7" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "ungelöst",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "ungelöst",
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
			canonicalForm: "lösen",
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
	sentenceMarkdown: "Die Aufgabe bleibt [ungelöst].",
	classifierNotes:
		"Ungelöst is treated here as a bare predicative Partizip-II form of lösen. Even though bleibt ungelöst strongly suggests a state reading, the stricter German participle rule keeps non-attributive participles of lexical verbs under VERB rather than shifting them to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
