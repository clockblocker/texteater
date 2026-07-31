import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 7,
	surfaceSegmentIndices: [7],
	attestedSurface: "steht",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "steht",
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
			canonicalForm: "stehen",
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
	sentenceMarkdown: `Sieh einmal, hier [steht] er, 
pfui, der Struwwelpeter!`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
