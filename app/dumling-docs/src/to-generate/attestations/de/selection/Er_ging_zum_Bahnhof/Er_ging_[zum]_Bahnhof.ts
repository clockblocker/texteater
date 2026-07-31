import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection039 = {
	segmentedSentenceId: "sentence_W0FdI2ZwSSCNo_jmi5" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "zum",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "zum",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "zum",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	selection: deSelection039,
	sentenceMarkdown: "Er ging [zum] Bahnhof.",
	classifierNotes:
		"Zum is modeled as Construction/Fusion, with the fused form itself as the canonical lemma and citation surface.",
	isVerified: true,
} as const satisfies AttestedSelection;
