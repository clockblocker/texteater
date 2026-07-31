import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const twentyFirstAdjectiveOrdinalSelection = {
	segmentedSentenceId: "sentence_rdzpTeo3Lutu97P4Mz" as SegmentedSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "twenty-first",
	selectedOrthography: "Standard",

	surface: {
		language: "en",
		normalizedSurface: "twenty-first",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "twenty-first",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				numForm: "Word",
				numType: "Ord",
				abbr: null,
				extPos: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"en", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: twentyFirstAdjectiveOrdinalSelection,
	sentenceMarkdown: "The [twenty-first] attempt finally passed.",
	classifierNotes:
		"The hyphenated ordinal modifying a noun is ADJ with ordinal number features.",
} as const satisfies AttestedSelection;
