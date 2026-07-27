import type { AttestedSelection, Selection } from "dumling/types";

const habayitPartialSelection = {
	language: "he",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "בית",

	surface: {
		language: "he",
		normalizedFullSurface: "הבית",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
		},
		lemma: {
			language: "he",
			canonicalLemma: "בית",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🏠",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: habayitPartialSelection,
	sentenceMarkdown: "חזרתי ל[בית].",
	classifierNotes:
		"בית is a partial selection against a definite noun surface; the omitted article still drives definite Def.",
} as const satisfies AttestedSelection;
