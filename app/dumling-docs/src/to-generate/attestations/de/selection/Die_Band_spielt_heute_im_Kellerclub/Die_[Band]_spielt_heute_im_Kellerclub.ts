import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection003 = {
	segmentedSentenceId: "sentence_6LFyJAaTsUo3oXcIHA" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Band",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Band",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Band",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection003,
	sentenceMarkdown: "Die [Band] spielt heute im Kellerclub.",
	classifierNotes:
		"This is the feminine lexical item meaning a music group, despite sharing its spelling with the other Band entries.",
	isVerified: true,
} as const satisfies AttestedSelection;
