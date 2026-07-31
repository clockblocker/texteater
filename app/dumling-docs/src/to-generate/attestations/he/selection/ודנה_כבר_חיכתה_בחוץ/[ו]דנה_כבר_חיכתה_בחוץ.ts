import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const vavCliticSelection = {
	segmentedSentenceId: "sentence_BbUUz8-Cma7C7UlLSU" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "ו",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "ו",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ו",
			family: "Morpheme",
			kind: "Clitic",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Morpheme", "Clitic">;

export const attestation = {
	selection: vavCliticSelection,
	sentenceMarkdown: "[ו]דנה כבר חיכתה בחוץ.",
	classifierNotes:
		"ו is modeled as a morpheme clitic rather than CCONJ to stress bound orthographic attachment.",
} as const satisfies AttestedSelection;
