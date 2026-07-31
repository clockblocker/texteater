import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const halfDeterminerFractionSelection = {
	segmentedSentenceId: "sentence_ULFtf9AYp5MR1UoGLu" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "half",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "half",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "half",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				numForm: "Word",
				numType: "Frac",
				abbr: null,
				definite: null,
				extPos: null,
				pronType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "DET">;

export const attestation = {
	selection: halfDeterminerFractionSelection,
	sentenceMarkdown: "Use [half] the flour first.",
	classifierNotes:
		"Half before a noun phrase is DET with fractional number features, not NUM.",
} as const satisfies AttestedSelection;
