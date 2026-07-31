import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_xqLp_lkYYRnJqE3nOg" as SegmentedSentenceId,
	clickedSegmentIndex: 10,
	surfaceSegmentIndices: [10],
	attestedSurface: "anders",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "anders",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "anders",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Am nächsten Morgen war alles [anders].",
	classifierNotes:
		"Anders is treated as a citation-shaped adjective in predicative use because it is the complement of sein and predicates over alles, not over the event. Even though it can feel adverb-like in English glossing, dumling's German patterns classify comparable predicative forms like tot and entzwei as ADJ rather than ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
