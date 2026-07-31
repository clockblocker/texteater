import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_bqCdQ7dD63IMYzG19x" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Angestellten",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Angestellten",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalForm: "Angestellter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die [Angestellten] streikten gestern.",
	classifierNotes:
		"Angestellten is a substantivized participial form used here as a plural noun. Under the German rule for nominalized verb forms, it classifies as NOUN rather than ADJ or VERB; subject position and verb agreement support nominative plural.",
	isVerified: true,
} as const satisfies AttestedSelection;
