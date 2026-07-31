import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_SgIl1suHkvwNJEYvKv" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "lasse",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "lasse",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "1",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "lassen",
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
	sentenceMarkdown: "Ich [lasse] mir morgen die Haare schneiden.",
	classifierNotes:
		"Lasse is the 1st-person singular present indicative form of the lexical verb lassen heading the causative construction.",
	isVerified: true,
} as const satisfies AttestedSelection;
