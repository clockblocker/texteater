import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection019 = {
	segmentedSentenceId: "sentence_Vyo2QLuNurqdiaDd7V" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "übergesetzt",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "übergesetzt",
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
			canonicalForm: "übersetzen",
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
	selection: deSelection019,
	sentenceMarkdown: "Der Fährmann hat uns [übergesetzt].",
	classifierNotes:
		"This is the ferry-across participle, with related spelling but a different sense.",
	isVerified: true,
} as const satisfies AttestedSelection;
