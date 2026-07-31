import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const thatDeterminerSelection = {
	segmentedSentenceId: "sentence_bZLBsv16dQ-Fsg5JOh" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
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
			kind: "DET",
			coreFeatures: {
				pronType: "Dem",
				abbr: null,
				definite: null,
				extPos: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "DET">;

export const attestation = {
	selection: thatDeterminerSelection,
	sentenceMarkdown: "Move [that] chair, please.",
	classifierNotes:
		"That before a noun is DET, distinct from pronominal and complementizer that.",
} as const satisfies AttestedSelection;
