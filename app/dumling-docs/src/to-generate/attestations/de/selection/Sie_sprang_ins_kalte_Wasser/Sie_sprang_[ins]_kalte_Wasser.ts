import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection040 = {
	segmentedSentenceId: "sentence_fYA7rM3wVDNBEMLjRi" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "ins",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "ins",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "ins",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	selection: deSelection040,
	sentenceMarkdown: "Sie sprang [ins] kalte Wasser.",
	classifierNotes:
		"Ins gets the same Construction/Fusion treatment as zum; the public DTO preserves the fused form intact.",
	isVerified: true,
} as const satisfies AttestedSelection;
