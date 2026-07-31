import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_g5jL5RkQIBVnOnD-55" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "schweigend",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "schweigend",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Pres",
			verbForm: "Part",
			aspect: null,
			gender: null,
			mood: null,
			number: null,
			person: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "schweigen",
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
	sentenceMarkdown: "Er saß [schweigend] am Fenster.",
	classifierNotes:
		"Schweigend is the present participial form of schweigen used non-attributively. Under the repo's German rule for present participles, that keeps it under VERB rather than shifting it to ADJ or ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
