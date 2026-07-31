import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection016 = {
	segmentedSentenceId: "sentence_UamNmqXJvjR41T5Mxd" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "umfuhr",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "umfuhr",
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
	selection: deSelection016,
	sentenceMarkdown: "Sie [umfuhr] die Baustelle weiträumig.",
	classifierNotes:
		"This is inseparable umfahren in the past finite form, so there is no separable-prefix feature.",
	isVerified: true,
} as const satisfies AttestedSelection;
