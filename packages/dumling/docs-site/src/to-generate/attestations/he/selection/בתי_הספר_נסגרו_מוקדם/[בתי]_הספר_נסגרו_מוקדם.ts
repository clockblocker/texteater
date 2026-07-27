import type { AttestedSelection, Selection } from "dumling/types";

const bateiConstructSelection = {
	language: "he",
	spelledSelection: "בתי",

	surface: {
		language: "he",
		normalizedFullSurface: "בתי",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Cons",
			number: "Plur",
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
	selection: bateiConstructSelection,
	sentenceMarkdown: "[בתי] הספר נסגרו מוקדם.",
	classifierNotes:
		"בתי is the construct plural of בית, using definite Cons and number Plur.",
} as const satisfies AttestedSelection;
