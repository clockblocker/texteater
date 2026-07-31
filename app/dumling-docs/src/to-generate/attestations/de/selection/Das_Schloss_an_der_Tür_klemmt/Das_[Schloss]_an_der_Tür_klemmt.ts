import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection012 = {
	segmentedSentenceId: "sentence_dXTIc8SRfVK0ZLEi-h" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Schloss",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Schloss",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Schloss",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection012,
	sentenceMarkdown: "Das [Schloss] an der Tür klemmt.",
	classifierNotes: "This is the lock sense of Schloss.",
	isVerified: true,
} as const satisfies AttestedSelection;
