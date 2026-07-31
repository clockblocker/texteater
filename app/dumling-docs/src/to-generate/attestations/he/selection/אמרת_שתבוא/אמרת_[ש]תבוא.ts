import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const shePrefixSelection = {
	segmentedSentenceId: "sentence_xRSNkGXyCoPAX-FjnW" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "ש",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "ש",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ש",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: shePrefixSelection,
	sentenceMarkdown: "אמרת [ש]תבוא.",
	classifierNotes:
		"ש is modeled as the bound complementizer or relative-marker prefix morpheme.",
} as const satisfies AttestedSelection;
