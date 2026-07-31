import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_PgDlfqT9T9-T5IqcH2" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "Schwimmen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Schwimmen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Schwimmen",
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
	selection: deSelection,
	sentenceMarkdown: "[Schwimmen] ist gesund.",
	classifierNotes:
		"Schwimmen is classified as a substantivized infinitive here, so the selected learner-facing unit is a neuter noun rather than the verb schwimmen. The attested form is already citation-shaped for that nominal reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
