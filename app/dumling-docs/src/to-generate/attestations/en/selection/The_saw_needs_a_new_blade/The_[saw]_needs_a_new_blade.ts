import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const sawNounSelection = {
	segmentedSentenceId: "sentence_a6bVhAD6v9qGLtxgDy" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "saw",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "saw",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "saw",
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
	selection: sawNounSelection,
	sentenceMarkdown: "The [saw] needs a new blade.",
	classifierNotes:
		"Tool saw is a noun citation surface; the model can keep it distinct from the verb surface saw.",
} as const satisfies AttestedSelection;
