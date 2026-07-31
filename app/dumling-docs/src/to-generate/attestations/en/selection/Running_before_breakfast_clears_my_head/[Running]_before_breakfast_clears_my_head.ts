import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const runningGerundSelection = {
	segmentedSentenceId: "sentence_M-BOWUBrPVR33isPve" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Running",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "running",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Ger",
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "run",
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
	selection: runningGerundSelection,
	sentenceMarkdown: "[Running] before breakfast clears my head.",
	classifierNotes:
		"Gerund running is a VERB inflection, not a noun, despite occupying a nominal clause position.",
} as const satisfies AttestedSelection;
