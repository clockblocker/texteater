import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_qzvigr_CqXneesTaG-" as SegmentedSentenceId,
	clickedSegmentIndex: 17,
	surfaceSegmentIndices: [17],
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
	selection: deSelection,
	sentenceMarkdown: `nahm Ranzen, Pulverhorn und Flint
und lief hinaus [ins] Feld geschwind`,
	classifierNotes:
		"Ins is the usual German fused form, so Dumling keeps it as Construction/Fusion rather than decomposing it into in + das.",
	isVerified: true,
} as const satisfies AttestedSelection;
