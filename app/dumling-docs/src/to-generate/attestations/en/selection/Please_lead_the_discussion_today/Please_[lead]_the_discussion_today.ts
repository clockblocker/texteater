import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const leadVerbHomographSelection = {
	segmentedSentenceId: "sentence_w4c7onQ-_-_4Suv0xC" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "lead",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "lead",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "lead",
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
	selection: leadVerbHomographSelection,
	sentenceMarkdown: "Please [lead] the discussion today.",
	classifierNotes:
		"Verb lead is kept separate from noun lead despite identical spelling.",
} as const satisfies AttestedSelection;
