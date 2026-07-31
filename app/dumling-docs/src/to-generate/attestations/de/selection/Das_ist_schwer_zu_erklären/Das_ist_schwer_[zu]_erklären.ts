import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection042 = {
	segmentedSentenceId: "sentence_CzbkkaUxPUT6xDcrQ6" as SegmentedSentenceId,
	clickedSegmentIndex: 6,
	surfaceSegmentIndices: [6],
	attestedSurface: "zu",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "zu",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "zu",
			family: "Lexeme",
			kind: "PART",
			coreFeatures: {
				partType: "Inf",
				abbr: null,
				foreign: null,
				polarity: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "PART">;

export const attestation = {
	selection: deSelection042,
	sentenceMarkdown: "Das ist schwer [zu] erklären.",
	classifierNotes:
		"Infinitival zu is PART with partType Inf, distinct from prepositional zu.",
	isVerified: true,
} as const satisfies AttestedSelection;
