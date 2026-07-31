import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Sieh",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "sieh",
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
			canonicalForm: "sehen",
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
	sentenceMarkdown: `[Sieh] einmal, hier steht er, 
pfui, der Struwwelpeter!`,
	classifierNotes:
		"I kept Sieh as the imperative inflection of sehen rather than treating Sieh einmal as one larger formula; the sentence-initial capital remains only in clicked Text.",
	isVerified: true,
} as const satisfies AttestedSelection;
