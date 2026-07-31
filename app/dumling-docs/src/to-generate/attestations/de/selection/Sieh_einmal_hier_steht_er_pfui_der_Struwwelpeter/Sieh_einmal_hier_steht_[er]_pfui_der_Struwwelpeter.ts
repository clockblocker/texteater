import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 9,
	surfaceSegmentIndices: [9],
	attestedSurface: "er",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "er",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "er",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, hier steht [er], 
pfui, der Struwwelpeter!`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
