import type { AttestedSelection, Selection } from "dumling/types";

const einExistentialSelection = {
	language: "he",
	spelledSelection: "אין",

	surface: {
		language: "he",
		normalizedFullSurface: "אין",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "אין",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebExistential: "Yes",
			},
			meaningInEmojis: "❌",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: einExistentialSelection,
	sentenceMarkdown: "[אין] מקום פנוי.",
	classifierNotes:
		"אין is the negative existential verb; its negativity is lexical here, not an inflectional polarity feature.",
} as const satisfies AttestedSelection;
