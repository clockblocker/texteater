import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection026 = {
	segmentedSentenceId: "sentence_nYbFy4bgtZA6bCp_U-" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "gebeten",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "gebeten",
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
			canonicalForm: "bitten",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "um",
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection026,
	sentenceMarkdown: "Sie wurde um Geduld [gebeten].",
	classifierNotes:
		"The sentence is passive, but the selected participle is stored without voice because the form itself is simply the participle of bitten.",
	isVerified: true,
} as const satisfies AttestedSelection;
