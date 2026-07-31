import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection021 = {
	segmentedSentenceId: "sentence_Mc0y-hkBOwgqGPIsl0" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "wartet",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "wartet",
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
			canonicalForm: "warten",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "auf",
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection021,
	sentenceMarkdown: "Er [wartet] auf den Nachtbus.",
	classifierNotes:
		"The governed preposition auf is an inherent lemma feature, not part of the surface selection.",
	isVerified: true,
} as const satisfies AttestedSelection;
