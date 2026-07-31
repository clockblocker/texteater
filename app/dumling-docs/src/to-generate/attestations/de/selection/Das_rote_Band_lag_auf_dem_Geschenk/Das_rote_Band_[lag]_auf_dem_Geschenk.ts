import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_DlTSMmD1EMt2pojm1D" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "lag",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "lag",
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
			canonicalForm: "liegen",
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
	sentenceMarkdown: "Das rote Band [lag] auf dem Geschenk.",
	classifierNotes:
		"Lag is the past finite form of liegen in a stative location reading, not a causative legen form.",
	isVerified: true,
} as const satisfies AttestedSelection;
