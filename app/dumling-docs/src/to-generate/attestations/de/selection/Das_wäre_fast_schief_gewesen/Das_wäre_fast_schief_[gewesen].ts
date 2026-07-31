import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection022 = {
	segmentedSentenceId: "sentence_LTCnYJqNIvlWTzSpvk" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "gewesen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "gewesen",
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
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: deSelection022,
	sentenceMarkdown: "Das wäre fast schief [gewesen].",
	classifierNotes:
		"Gewesen is treated as an AUX participle rather than a lexical verb.",
	isVerified: true,
} as const satisfies AttestedSelection;
