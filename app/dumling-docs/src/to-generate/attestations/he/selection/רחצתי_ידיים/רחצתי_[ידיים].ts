import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const yadayimDualSelection = {
	segmentedSentenceId: "sentence_UM8ORmKVVIOxRv0SSm" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "ידיים",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "ידיים",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Dual",
			definite: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "יד",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: yadayimDualSelection,
	sentenceMarkdown: "רחצתי [ידיים].",
	classifierNotes: "ידיים is a dual-number surface for a paired body part.",
} as const satisfies AttestedSelection;
