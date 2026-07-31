import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 17,
	surfaceSegmentIndices: [17],
	attestedSurface: "Struwwelpeter",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Struwwelpeter",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Struwwelpeter",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
				foreign: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, hier steht er, 
pfui, der [Struwwelpeter]!`,
	classifierNotes:
		"I treated Struwwelpeter as PROPN: der is a stylistic article here, but the referent is still the named character rather than a common noun.",
	isVerified: true,
} as const satisfies AttestedSelection;
