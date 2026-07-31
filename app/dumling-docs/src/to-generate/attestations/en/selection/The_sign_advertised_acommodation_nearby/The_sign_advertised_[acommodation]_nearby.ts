import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const accommodationTypoPartialSelection = {
	segmentedSentenceId: "sentence_tGjnsoT-1Gd_LqozH4" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "acommodation",
	selectedOrthography: "Typo",

	surface: {
		language: "en",
		normalizedSurface: "accommodation",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "accommodation",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: accommodationTypoPartialSelection,
	sentenceMarkdown: "The sign advertised [acommodation] nearby.",
	classifierNotes:
		"Acommodation is represented as Typo with normalized surface accommodation; no edit-distance metadata exists.",
} as const satisfies AttestedSelection;
