import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection045 = {
	segmentedSentenceId: "sentence_QvKc2pEtNZ4U5NrDrU" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [6, 8, 10, 12, 14],
	attestedSurface: "den Nagel auf den Kopf",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "den nagel auf den kopf",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "den Nagel auf den Kopf treffen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection045,
	sentenceMarkdown: "Damit triffst du den [Nagel] auf den Kopf.",
	classifierNotes:
		"The inflected sentence form points to the citation phraseme; the selected token is only an internal component.",
	isVerified: true,
} as const satisfies AttestedSelection;
