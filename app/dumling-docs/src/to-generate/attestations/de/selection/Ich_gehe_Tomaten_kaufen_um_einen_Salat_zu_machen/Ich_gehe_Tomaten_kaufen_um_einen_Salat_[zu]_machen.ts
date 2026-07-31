import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_D9VcoslQXCiHTD6oI0" as SegmentedSentenceId,
	clickedSegmentIndex: 15,
	surfaceSegmentIndices: [9, 15],
	attestedSurface: "um zu",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "um zu",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "um zu",
			family: "Construction",
			kind: "PairedFrame",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Construction", "PairedFrame">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Ich gehe Tomaten kaufen, um einen Salat [zu] machen.",
	classifierNotes:
		"This is a partial selection of the learner-facing Construction/PairedFrame `um zu`; the current selection format still anchors only the highlighted token, but the lexical identity now stays with the paired frame rather than with standalone PART `zu`.",
} as const satisfies AttestedSelection;
