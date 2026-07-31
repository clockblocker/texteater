import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_atPyhQH2K-TFlFMXoW" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "Rennen",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Rennen",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Rennen",
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
	sentenceMarkdown: "Das [Rennen] hat Spaß gemacht.",
	classifierNotes:
		"Rennen is treated here as a substantivized infinitive used as a neuter noun. Following the repo's nominalized-verb rule and the existing Meckern example, the learner-facing unit is NOUN rather than the verb rennen.",
	isVerified: true,
} as const satisfies AttestedSelection;
