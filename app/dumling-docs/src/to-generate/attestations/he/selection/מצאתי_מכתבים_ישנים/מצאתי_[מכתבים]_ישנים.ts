import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const michtavimNounSelection = {
	segmentedSentenceId: "sentence_u_KCbNveYbLr7nx5wN" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "מכתבים",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "מכתבים",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
			definite: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "מכתב",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: michtavimNounSelection,
	sentenceMarkdown: "מצאתי [מכתבים] ישנים.",
	classifierNotes:
		"מכתבים is the plural noun from מכתב, not a verb-root attestation.",
} as const satisfies AttestedSelection;
