import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_LTCnYJqNIvlWTzSpvk" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "wäre",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "wäre",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Sub",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
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
	sentenceMarkdown: "Das [wäre] fast schief gewesen.",
	classifierNotes:
		"The Konjunktiv-II form is mapped to supported mood Sub plus past tense.",
	isVerified: true,
} as const satisfies AttestedSelection;
