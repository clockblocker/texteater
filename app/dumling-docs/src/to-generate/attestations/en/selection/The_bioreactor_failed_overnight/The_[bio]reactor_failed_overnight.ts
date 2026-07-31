import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const bioRootPartialSelection = {
	segmentedSentenceId: "sentence_yyuSvaqjy9k_uaYxhC" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "bio",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "bio",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "bio",
			family: "Morpheme",
			kind: "Root",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Root">;

export const attestation = {
	selection: bioRootPartialSelection,
	sentenceMarkdown: "The [bio]reactor failed overnight.",
	classifierNotes:
		"Bio is modeled as a bound root in bioreactor, not as a free clipping of biography.",
} as const satisfies AttestedSelection;
