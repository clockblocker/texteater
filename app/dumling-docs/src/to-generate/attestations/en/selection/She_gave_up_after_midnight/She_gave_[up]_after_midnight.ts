import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const giveUpSelection = {
	segmentedSentenceId: "sentence_xIBOExLYf7d656tQk5" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [2, 4],
	attestedSurface: "gave up",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "gave up",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: null,
			number: null,
			person: null,
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "give up",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				phrasal: "Yes",
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: giveUpSelection,
	sentenceMarkdown: "She gave [up] after midnight.",
	classifierNotes:
		"Clicking the particle resolves the complete phrasal-verb occurrence `gave up`; the click is one member of that Surface.",
} as const satisfies AttestedSelection;
