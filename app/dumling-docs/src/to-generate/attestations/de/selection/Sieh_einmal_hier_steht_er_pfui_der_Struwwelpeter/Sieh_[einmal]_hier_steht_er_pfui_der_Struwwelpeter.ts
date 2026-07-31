import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MhPGzTBSaMzPHnhyp3" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "einmal",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "einmal",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "einmal",
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
	sentenceMarkdown: `Sieh [einmal], hier steht er, 
pfui, der Struwwelpeter!`,
	classifierNotes:
		"I treated einmal here as an adverb rather than as part of a larger fixed expression with Sieh; in this line it functions like a discourse-softening or temporal adverbial token.",
} as const satisfies AttestedSelection;
