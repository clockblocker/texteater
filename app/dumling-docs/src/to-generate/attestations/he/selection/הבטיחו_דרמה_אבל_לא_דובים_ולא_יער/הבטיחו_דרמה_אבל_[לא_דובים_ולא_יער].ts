import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const loDubimVeloYaarSelection = {
	segmentedSentenceId: "sentence_pHdw3Ar3yaTM9V7Eg9" as SegmentedSentenceId,
	clickedSegmentIndex: 7,
	surfaceSegmentIndices: [7, 9, 11, 13],
	attestedSurface: "לא דובים ולא יער",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "לא דובים ולא יער",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "לא דובים ולא יער",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: loDubimVeloYaarSelection,
	sentenceMarkdown: "הבטיחו דרמה, אבל [לא דובים ולא יער].",
	classifierNotes:
		"לא דובים ולא יער is classified as an idiom; it is proverb-like, but used here as a fixed idiomatic denial.",
} as const satisfies AttestedSelection;
