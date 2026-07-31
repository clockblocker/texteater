import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const eizeDeterminerSelection = {
	segmentedSentenceId: "sentence_15XuoZ3qMZpEjVESIC" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "איזה",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "איזה",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			definite: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "איזה",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				pronType: "Int",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: eizeDeterminerSelection,
	sentenceMarkdown: "[איזה] רחוב זה?",
	classifierNotes:
		"איזה is an interrogative determiner rather than a pronoun because it modifies רחוב.",
} as const satisfies AttestedSelection;
