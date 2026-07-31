import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection004 = {
	segmentedSentenceId: "sentence_BHQN44NTD4kR4TBhpj" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "Band",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Band",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Band",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection004,
	sentenceMarkdown: "Der dritte [Band] ist längst vergriffen.",
	classifierNotes:
		"This is the masculine lexical item meaning volume, which stresses homograph and gender disambiguation.",
	isVerified: true,
} as const satisfies AttestedSelection;
