import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection007 = {
	segmentedSentenceId: "sentence_zmPisOE9-nR6aoTARL" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
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
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection007,
	sentenceMarkdown: "Der [Kiefer] schmerzte nach der Operation.",
	classifierNotes: "Kiefer is the masculine jaw sense here.",
	isVerified: true,
} as const satisfies AttestedSelection;
