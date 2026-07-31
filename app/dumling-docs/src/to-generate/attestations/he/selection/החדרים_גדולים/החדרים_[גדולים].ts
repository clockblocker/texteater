import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const gdolimAdjectiveSelection = {
	segmentedSentenceId: "sentence_xZSjJ7NH1HYRctl_q6" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "גדולים",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "גדולים",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			definite: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "גדול",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: gdolimAdjectiveSelection,
	sentenceMarkdown: "החדרים [גדולים].",
	classifierNotes: "גדולים is a masculine plural adjective inflection.",
} as const satisfies AttestedSelection;
