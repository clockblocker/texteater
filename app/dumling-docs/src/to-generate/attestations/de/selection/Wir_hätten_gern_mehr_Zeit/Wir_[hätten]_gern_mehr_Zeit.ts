import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection023 = {
	segmentedSentenceId: "sentence_oBK2wb51i9Eo_eHj5f" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "hätten",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "hätten",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Sub",
			number: "Plur",
			person: "1",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "haben",
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
	selection: deSelection023,
	sentenceMarkdown: "Wir [hätten] gern mehr Zeit.",
	classifierNotes:
		"The Konjunktiv-like form is mapped to supported mood Sub plus past tense.",
	isVerified: true,
} as const satisfies AttestedSelection;
