import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const lePrefixSelection = {
	segmentedSentenceId: "sentence_1UKL3rSeg1YqwoRPFM" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "ל",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "ל",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ל",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: lePrefixSelection,
	sentenceMarkdown: "יצאתי [ל]עבודה מוקדם.",
	classifierNotes:
		"ל is treated as a prefix morpheme, not a full adposition lexeme, because it is selected inside an attached form.",
} as const satisfies AttestedSelection;
