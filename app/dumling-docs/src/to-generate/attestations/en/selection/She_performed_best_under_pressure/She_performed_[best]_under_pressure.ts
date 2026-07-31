import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const bestAdverbSelection = {
	segmentedSentenceId: "sentence_jVuCQDb4XpaPPvLGwr" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "best",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "best",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			degree: "Sup",
		},
		lemma: {
			language: "en",
			canonicalForm: "well",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				abbr: null,
				extPos: null,
				numForm: null,
				numType: null,
				pronType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "ADV">;

export const attestation = {
	selection: bestAdverbSelection,
	sentenceMarkdown: "She performed [best] under pressure.",
	classifierNotes:
		"Best is modeled as a superlative adverb here, not an adjective, because it modifies performed.",
} as const satisfies AttestedSelection;
