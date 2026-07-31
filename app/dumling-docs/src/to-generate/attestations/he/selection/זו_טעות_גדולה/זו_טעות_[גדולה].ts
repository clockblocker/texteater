import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const gdolaAdjectiveSelection = {
	segmentedSentenceId: "sentence_PaR8658doy91n1_r7Z" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "גדולה",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "גדולה",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
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
	selection: gdolaAdjectiveSelection,
	sentenceMarkdown: "זו טעות [גדולה].",
	classifierNotes: "גדולה is a feminine singular adjective inflection.",
} as const satisfies AttestedSelection;
