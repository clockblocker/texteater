import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const llCliticPartialSelection = {
	segmentedSentenceId: "sentence_AIBHcb3olXWJJxUjSM" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "ll",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "ll",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "'ll",
			family: "Morpheme",
			kind: "Clitic",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Clitic">;

export const attestation = {
	selection: llCliticPartialSelection,
	sentenceMarkdown: "I'[ll] call when I arrive.",
	classifierNotes:
		'The apostrophe is outside the selected substring, so `surface.spelling: "Variant"` marks the mismatch against the clitic lemma.',
} as const satisfies AttestedSelection;
