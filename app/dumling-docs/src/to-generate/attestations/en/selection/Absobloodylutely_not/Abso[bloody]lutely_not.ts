import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const bloodyInfixPartialSelection = {
	segmentedSentenceId: "sentence_Q95_kgXeerF1B4Yyb4" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "bloody",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "bloody",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "bloody",
			family: "Morpheme",
			kind: "Infix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Morpheme", "Infix">;

export const attestation = {
	selection: bloodyInfixPartialSelection,
	sentenceMarkdown: "Abso-[bloody]-lutely not.",
	classifierNotes:
		"Expletive insertion is classified as Infix to stress an edge case that is morphologically debatable.",
} as const satisfies AttestedSelection;
