import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const lessIsMoreAphorismSelection = {
	segmentedSentenceId: "sentence_ja0FGJPF0l6qXv3O93" as SegmentedSentenceId,
	clickedSegmentIndex: 7,
	surfaceSegmentIndices: [7, 9, 11],
	attestedSurface: "less is more",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "less is more",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "less is more",
			family: "Phraseme",
			kind: "Aphorism",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Aphorism">;

export const attestation = {
	selection: lessIsMoreAphorismSelection,
	sentenceMarkdown: "For this layout, [less is more].",
	classifierNotes:
		"Less is more is treated as an aphorism rather than a proverb because it states a maxim without narrative proverb form.",
} as const satisfies AttestedSelection;
