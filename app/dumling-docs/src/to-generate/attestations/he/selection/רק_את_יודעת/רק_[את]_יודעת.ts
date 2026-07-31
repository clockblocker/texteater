import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const atPronounSelection = {
	segmentedSentenceId: "sentence_0d7c1t9EOW7SWkjgbW" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "את",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "את",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			person: "2",
		},
		lemma: {
			language: "he",
			canonicalForm: "את",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Prs",
				definite: null,
				reflex: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: atPronounSelection,
	sentenceMarkdown: "רק [את] יודעת.",
	classifierNotes:
		"את is the pronoun homograph here, modeled with feminine second-person features.",
} as const satisfies AttestedSelection;
