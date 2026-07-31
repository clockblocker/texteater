import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_-bvXWOr59I2MkOFxRA" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
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
	selection: deSelection,
	sentenceMarkdown: "Das wäre schön [gewesen].",
	classifierNotes:
		"Gewesen is treated as an AUX participle rather than a lexical verb.",
	isVerified: true,
} as const satisfies AttestedSelection;
