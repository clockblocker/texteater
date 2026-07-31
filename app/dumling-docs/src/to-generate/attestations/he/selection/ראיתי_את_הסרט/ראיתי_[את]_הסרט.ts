import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const etAccusativeSelection = {
	segmentedSentenceId: "sentence_mvDswpBxQbI64wQt9d" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "את",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "את",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "את",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				case: "Acc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: etAccusativeSelection,
	sentenceMarkdown: "ראיתי [את] הסרט.",
	classifierNotes:
		"את is the accusative marker here, modeled as ADP and kept separate from the pronoun homograph.",
} as const satisfies AttestedSelection;
