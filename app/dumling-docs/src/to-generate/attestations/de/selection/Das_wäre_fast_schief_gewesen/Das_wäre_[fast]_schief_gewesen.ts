import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const fastAdverbSelection = {
	segmentedSentenceId: "sentence_LTCnYJqNIvlWTzSpvk" as SegmentedSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "fast",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "fast",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "fast",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: fastAdverbSelection,
	sentenceMarkdown: "Das wäre [fast] schief gewesen.",
	classifierNotes:
		"Fast is the approximative adverb here, modifying the predication schief gewesen rather than functioning as an adjective or particle.",
	isVerified: true,
} as const satisfies AttestedSelection;
