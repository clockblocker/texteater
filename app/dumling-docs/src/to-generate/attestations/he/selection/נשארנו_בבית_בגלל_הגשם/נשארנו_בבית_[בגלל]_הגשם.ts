import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const biglalAdpositionSelection = {
	segmentedSentenceId: "sentence_00Nbuj_-Asv25VvyzU" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "בגלל",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "בגלל",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "בגלל",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				abbr: null,
				case: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: biglalAdpositionSelection,
	sentenceMarkdown: "נשארנו בבית [בגלל] הגשם.",
	classifierNotes:
		"בגלל is a causal adposition without an additional case feature in the current schema.",
} as const satisfies AttestedSelection;
