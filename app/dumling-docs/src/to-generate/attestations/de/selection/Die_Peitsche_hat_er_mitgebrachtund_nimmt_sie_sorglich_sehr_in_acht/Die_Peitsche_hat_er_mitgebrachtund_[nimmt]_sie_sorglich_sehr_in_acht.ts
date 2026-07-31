import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 12,
	surfaceSegmentIndices: [12],
	attestedSurface: "nimmt",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "nimmt",
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
und [nimmt] sie sorglich sehr in acht.`,
	classifierNotes:
		"The clause uses the fixed expression in acht nehmen, so the finite verb token is treated as a partial selection of the idiom rather than as a standalone nehmen inflection.",
	isVerified: true,
} as const satisfies AttestedSelection;
