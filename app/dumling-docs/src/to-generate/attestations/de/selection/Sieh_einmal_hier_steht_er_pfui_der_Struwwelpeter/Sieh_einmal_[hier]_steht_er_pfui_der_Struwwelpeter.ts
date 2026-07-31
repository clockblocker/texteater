import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 5,
	surfaceSegmentIndices: [5],
	attestedSurface: "hier",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "hier",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "hier",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, [hier] steht er, 
pfui, der Struwwelpeter!`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
