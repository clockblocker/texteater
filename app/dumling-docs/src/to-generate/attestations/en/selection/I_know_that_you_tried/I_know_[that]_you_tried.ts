import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const thatSubordinatorSelection = {
	segmentedSentenceId: "sentence_i2doz2xDyLuG5Kvs-t" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "that",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "that",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "that",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				abbr: null,
				extPos: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	selection: thatSubordinatorSelection,
	sentenceMarkdown: "I know [that] you tried.",
	classifierNotes:
		"Complementizer that is SCONJ; no clause-type feature exists, so POS carries the distinction.",
} as const satisfies AttestedSelection;
