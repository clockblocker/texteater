import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const dependOnGovernedPrepSelection = {
	segmentedSentenceId: "sentence_XzH7eRJjNlh1q17rUs" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2, 4],
	attestedSurface: "depend on",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "depend on",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "depend on",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "on",
				abbr: null,
				extPos: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: dependOnGovernedPrepSelection,
	sentenceMarkdown: "We [depend] on accurate labels.",
	classifierNotes:
		"Depend on uses hasGovPrep rather than phrasal because on is governed by the verb.",
} as const satisfies AttestedSelection;
