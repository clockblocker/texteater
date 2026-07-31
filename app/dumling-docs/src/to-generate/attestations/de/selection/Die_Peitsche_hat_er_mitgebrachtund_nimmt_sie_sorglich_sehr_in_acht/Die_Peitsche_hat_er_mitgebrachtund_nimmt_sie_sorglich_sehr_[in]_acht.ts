import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 20,
	surfaceSegmentIndices: [20, 22],
	attestedSurface: "in acht",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "in acht",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "in acht nehmen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und nimmt sie sorglich sehr [in] acht.`,
	classifierNotes:
		"I treated in as part of the idiom in acht nehmen rather than as a free adposition, because the phrase is functioning as one fixed learner-facing unit here.",
	isVerified: true,
} as const satisfies AttestedSelection;
