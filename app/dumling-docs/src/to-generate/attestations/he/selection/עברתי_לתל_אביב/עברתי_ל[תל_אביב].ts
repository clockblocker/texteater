import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const telAvivSelection = {
	segmentedSentenceId: "sentence_ukFoVCDzYmTXw_tYrp" as SegmentedSentenceId,
	clickedSegmentIndex: 3,
	surfaceSegmentIndices: [3, 5],
	attestedSurface: "תל אביב",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "תל אביב",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "תל אביב",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	selection: telAvivSelection,
	sentenceMarkdown: "עברתי ל[תל אביב].",
	classifierNotes:
		"תל אביב is a multiword proper-noun citation with no additional inflectional surface features.",
} as const satisfies AttestedSelection;
