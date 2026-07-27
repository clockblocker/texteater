import type { AttestedSelection, Selection } from "dumling/types";

const hasfarimSelection = {
	language: "he",
	spelledSelection: "הספרים",

	surface: {
		language: "he",
		normalizedFullSurface: "הספרים",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalLemma: "ספר",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "📚",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: hasfarimSelection,
	sentenceMarkdown: "[הספרים] על השולחן.",
	classifierNotes:
		"This is a full selection of a definite plural noun surface.",
} as const satisfies AttestedSelection;
