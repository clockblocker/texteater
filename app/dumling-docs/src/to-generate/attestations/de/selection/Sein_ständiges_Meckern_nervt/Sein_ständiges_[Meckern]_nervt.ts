import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_MsgRqA1nvSO-PiK66-" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "Meckern",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Meckern",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Meckern",
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
	sentenceMarkdown: "Sein ständiges [Meckern] nervt.",
	classifierNotes:
		"Meckern is treated here as a substantivized infinitive, so the learner-facing unit is a neuter noun rather than the verb `meckern`. The selected form is citation-shaped for this nominal reading, so it stays `Surface/Citation`.",
	isVerified: true,
} as const satisfies AttestedSelection;
