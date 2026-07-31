import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection038 = {
	segmentedSentenceId: "sentence_QDU7euUUeXateTmteu" as SegmentedSentenceId,
	clickedSegmentIndex: 8,
	surfaceSegmentIndices: [8],
	attestedSurface: "entlang",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "entlang",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "entlang",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Post",
				governedCase: "Acc",
				abbr: null,
				extPos: null,
				foreign: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection038,
	sentenceMarkdown: "Wir liefen den Fluss [entlang].",
	classifierNotes:
		"Entlang is treated as a postposition rather than an adverb because of its syntactic relation to den Fluss.",
	isVerified: true,
} as const satisfies AttestedSelection;
