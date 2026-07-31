import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const ochelNounSelection = {
	segmentedSentenceId: "sentence_Qq2cgAF698r3GS_HS7" as SegmentedSentenceId,
	clickedSegmentIndex: 1,
	surfaceSegmentIndices: [1],
	attestedSurface: "אוכל",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "אוכל",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "אוכל",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: ochelNounSelection,
	sentenceMarkdown: "ה[אוכל] כבר מוכן.",
	classifierNotes:
		"אוכל is the noun food here, separated from the future-verb homograph by lemma and POS.",
} as const satisfies AttestedSelection;
