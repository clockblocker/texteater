import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection025 = {
	segmentedSentenceId: "sentence_xPJWGEBGl2U_tBuwxH" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Geh",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "geh",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Sing",
			person: "2",
			verbForm: "Fin",
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "gehen",
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
	selection: deSelection025,
	sentenceMarkdown: "[Geh] bitte nicht ohne Jacke raus.",
	classifierNotes:
		"Imperative forms use mood Imp together with finite verbForm in the schema.",
	isVerified: true,
} as const satisfies AttestedSelection;
