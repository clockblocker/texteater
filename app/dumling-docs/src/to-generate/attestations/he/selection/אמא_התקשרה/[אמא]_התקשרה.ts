import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const imaVariantSelection = {
	segmentedSentenceId: "sentence_uPz_W_iaE0XEzkiP0E" as SegmentedSentenceId,
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "אמא",
	selectedOrthography: "Standard",

	surface: {
		language: "he",
		normalizedSurface: "אמא",
		spelling: "Variant",
		realizationCoverage: "Full",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "אימא",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: imaVariantSelection,
	sentenceMarkdown: "[אמא] התקשרה.",
	classifierNotes:
		'This captures an accepted spelling variant: selected spelling אמא, normalized surface אימא, so `surface.spelling: "Variant"` is the right mark.',
} as const satisfies AttestedSelection;
