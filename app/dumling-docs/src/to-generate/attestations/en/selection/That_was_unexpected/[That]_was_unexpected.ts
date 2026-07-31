import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const thatPronounSelection = {
	segmentedSentenceId: "sentence_DKVDt4T1RxtcaY2dPn" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "That",
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
			kind: "PRON",
			coreFeatures: {
				pronType: "Dem",
				abbr: null,
				extPos: null,
				person: null,
				poss: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "PRON">;

export const attestation = {
	selection: thatPronounSelection,
	sentenceMarkdown: "[That] was unexpected.",
	classifierNotes:
		"Standalone that is PRON; it shares its surface spelling with the DET and SCONJ examples.",
} as const satisfies AttestedSelection;
