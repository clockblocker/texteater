import type { Surface } from "dumling/types";

export const booksSurface = {
	language: "en",
	normalizedFullSurface: "books",
	surfaceKind: "Inflection",
	inflectionalFeatures: {
		number: "Plur",
	},
	lemma: {
		language: "en",
		canonicalLemma: "book",
		lemmaKind: "Lexeme",
		lemmaSubKind: "NOUN",
		inherentFeatures: {},
		meaningInEmojis: "📚",
	},
} satisfies Surface<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	order: 40,
	sentenceMarkdown: "The **books** are on the shelf.",
	surface: booksSurface,
} as const;
