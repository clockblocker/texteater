import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const sawVerbPastSelection = {
	segmentedSentenceId: "sentence_xqmfb2cU0Pml0zRWFX" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "saw",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "saw",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Past",
			verbForm: "Fin",
			mood: null,
			number: null,
			person: null,
			voice: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "see",
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
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: sawVerbPastSelection,
	sentenceMarkdown: "I [saw] the comet through binoculars.",
	classifierNotes:
		"Saw is the past finite surface of see, not the citation noun saw.",
} as const satisfies AttestedSelection;
