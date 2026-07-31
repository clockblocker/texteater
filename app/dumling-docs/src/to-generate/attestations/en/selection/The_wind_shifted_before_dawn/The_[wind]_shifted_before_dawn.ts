import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const windNounHomographSelection = {
	segmentedSentenceId: "sentence_lae_rssI9T-1eYfcru" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
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
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: windNounHomographSelection,
	sentenceMarkdown: "The [wind] shifted before dawn.",
	classifierNotes:
		"Wind as weather is a noun citation surface sharing spelling with the verb wind.",
} as const satisfies AttestedSelection;
