import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection005 = {
	segmentedSentenceId: "sentence_fU3gMMBiiaKxM1fhB_" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Leiter",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Leiter",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Leiter",
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
	selection: deSelection005,
	sentenceMarkdown: "Die [Leiter] wackelte auf dem nassen Boden.",
	classifierNotes: "Leiter is the ladder sense here, with feminine gender.",
	isVerified: true,
} as const satisfies AttestedSelection;
