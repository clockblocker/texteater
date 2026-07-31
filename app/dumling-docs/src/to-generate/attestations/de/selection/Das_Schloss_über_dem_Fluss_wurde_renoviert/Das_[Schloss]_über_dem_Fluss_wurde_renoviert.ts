import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection011 = {
	segmentedSentenceId: "sentence_0k4EHNh2gb9dMmYfUS" as SegmentedSentenceId,
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
	selection: deSelection011,
	sentenceMarkdown: "Das [Schloss] über dem Fluss wurde renoviert.",
	classifierNotes: "This is the castle sense of Schloss.",
	isVerified: true,
} as const satisfies AttestedSelection;
