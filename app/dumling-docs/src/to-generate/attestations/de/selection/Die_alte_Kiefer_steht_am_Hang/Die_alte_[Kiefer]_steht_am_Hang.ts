import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection008 = {
	segmentedSentenceId: "sentence_w8Bp4qce7lyCguG37l" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "Kiefer",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Kiefer",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Kiefer",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection008,
	sentenceMarkdown: "Die alte [Kiefer] steht am Hang.",
	classifierNotes: "Kiefer is the feminine pine-tree sense here.",
	isVerified: true,
} as const satisfies AttestedSelection;
