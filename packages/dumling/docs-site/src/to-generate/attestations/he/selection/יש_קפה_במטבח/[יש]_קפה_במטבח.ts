import type { AttestedSelection, Selection } from "dumling/types";

const yeshExistentialSelection = {
	language: "he",
	spelledSelection: "יש",

	surface: {
		language: "he",
		normalizedFullSurface: "יש",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "יש",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebExistential: "Yes",
			},
			meaningInEmojis: "✅",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "VERB">;

export const attestation = {
	selection: yeshExistentialSelection,
	sentenceMarkdown: "[יש] קפה במטבח.",
	classifierNotes:
		"יש is modeled as an existential verb, not as an adverb or particle.",
} as const satisfies AttestedSelection;
