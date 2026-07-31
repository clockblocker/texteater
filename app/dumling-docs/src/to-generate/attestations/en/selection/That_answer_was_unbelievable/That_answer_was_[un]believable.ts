import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const unPrefixPartialSelection = {
	segmentedSentenceId: "sentence_lohX58SH3DniQsW1An" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "un",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "un",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "un-",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: unPrefixPartialSelection,
	sentenceMarkdown: "That answer was [un]believable.",
	classifierNotes:
		"The canonical prefix contains a hyphen, but the selected substring inside a word does not, so it is marked Variant and Partial.",
} as const satisfies AttestedSelection;
