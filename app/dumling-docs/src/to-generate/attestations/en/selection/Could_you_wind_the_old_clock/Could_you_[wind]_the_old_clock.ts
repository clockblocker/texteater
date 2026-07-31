import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const windVerbHomographSelection = {
	segmentedSentenceId: "sentence_TfHrqD0ESu7TaplpiX" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "wind",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "wind",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "wind",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: windVerbHomographSelection,
	sentenceMarkdown: "Could you [wind] the old clock?",
	classifierNotes:
		"Wind as a verb is modeled separately from wind as weather; pronunciation contrast is outside the object.",
} as const satisfies AttestedSelection;
