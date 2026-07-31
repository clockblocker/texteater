import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const takeOffParticlePartialSelection = {
	segmentedSentenceId: "sentence_TnqEvCrJ2HKksBNVUX" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6, 8],
	attestedSurface: "take off",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "take off",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "take off",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				phrasal: "Yes",
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: takeOffParticlePartialSelection,
	sentenceMarkdown: "The plane will [take] off at dawn.",
	classifierNotes:
		"Only the verb component is selected, but the Lemma and surface are the phrasal verb take off.",
} as const satisfies AttestedSelection;
