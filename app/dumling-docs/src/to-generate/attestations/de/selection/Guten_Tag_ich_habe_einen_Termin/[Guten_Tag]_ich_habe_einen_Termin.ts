import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection048 = {
	segmentedSentenceId: "sentence_y9gjPQS__rtmCpBSJU" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0, 2],
	attestedSurface: "Guten Tag",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "Guten Tag",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Guten Tag",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Greeting",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: deSelection048,
	sentenceMarkdown: "[Guten Tag], ich habe einen Termin.",
	classifierNotes:
		"Guten Tag is treated as a greeting formula rather than as a compositional adjective plus noun phrase.",
	isVerified: true,
} as const satisfies AttestedSelection;
