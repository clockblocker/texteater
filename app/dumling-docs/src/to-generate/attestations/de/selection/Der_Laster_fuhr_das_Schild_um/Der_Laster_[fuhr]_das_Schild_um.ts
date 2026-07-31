import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection017 = {
	segmentedSentenceId: "sentence_IYTIHaMfzuooemR0N-" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4, 10],
	attestedSurface: "fuhr um",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "fuhr um",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "umfahren",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "um",
				hasGovPrep: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection017,
	sentenceMarkdown: "Der Laster [fuhr] das Schild um.",
	classifierNotes:
		"This is discontinuous separable umfahren compressed into the full surface fuhr um; the selected spelling is only the finite verb token.",
	isVerified: true,
} as const satisfies AttestedSelection;
