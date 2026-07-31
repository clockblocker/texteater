import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const hemPronounSelection = {
	segmentedSentenceId: "sentence_PcTNil2HfPNxL4YT2Y" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "הם",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "הם",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			person: "3",
		},
		lemma: {
			language: "he",
			canonicalForm: "הם",
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
	selection: hemPronounSelection,
	sentenceMarkdown: "[הם] הגיעו בזמן.",
	classifierNotes: "הם is a third-person masculine plural pronoun.",
} as const satisfies AttestedSelection;
