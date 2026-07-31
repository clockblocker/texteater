import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_pJroeJAAiSmYPgsKOZ" as SegmentedSentenceId,
	clickedSegmentIndex: 22,
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
und nimmt sie sorglich sehr in [acht].`,
	classifierNotes:
		"Acht is not the numeral here. It is the internal noun-shaped component of the fixed idiom in acht nehmen, so the selection points to the whole idiom.",
	isVerified: true,
} as const satisfies AttestedSelection;
