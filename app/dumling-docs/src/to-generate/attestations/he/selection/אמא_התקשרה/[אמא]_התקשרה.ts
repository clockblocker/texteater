import type { AttestedSelection, Selection } from "dumling/types";

const imaVariantSelection = {
	language: "he",
	selectionFeatures: { spelling: "Variant" },
	spelledSelection: "אמא",

	surface: {
		language: "he",
		normalizedFullSurface: "אימא",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "אימא",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "👩",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: imaVariantSelection,
	sentenceMarkdown: "[אמא] התקשרה.",
	classifierNotes:
		'This captures an accepted spelling variant: selected spelling אמא, normalized surface אימא, so `selectionFeatures.spelling: "Variant"` is the right mark.',
} as const satisfies AttestedSelection;
