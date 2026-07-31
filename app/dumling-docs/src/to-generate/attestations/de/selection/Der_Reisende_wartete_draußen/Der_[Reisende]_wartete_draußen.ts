import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_uEW-IH2qTVNML_5Tkt" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Reisende",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Reisende",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Reisende",
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
	selection: deSelection,
	sentenceMarkdown: "Der [Reisende] wartete draußen.",
	classifierNotes:
		"Reisende is treated here as a substantivized present participle, so the learner-facing unit is a noun rather than an adjective or verb. The selected form is already citation-shaped for this nominal reading, so it stays `Surface/Citation`.",
	isVerified: true,
} as const satisfies AttestedSelection;
