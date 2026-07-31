import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection018 = {
	segmentedSentenceId: "sentence_FPdvGey2ASAq6zIp_X" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "übersetzt",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "übersetzt",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
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
	selection: deSelection018,
	sentenceMarkdown: "Sie [übersetzt] den Vertrag ins Deutsche.",
	classifierNotes:
		"The ambiguous surface übersetzt is taken as present finite, not as a participle.",
	isVerified: true,
} as const satisfies AttestedSelection;
