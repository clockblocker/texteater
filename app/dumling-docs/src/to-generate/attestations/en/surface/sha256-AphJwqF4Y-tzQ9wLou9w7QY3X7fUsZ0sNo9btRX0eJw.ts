import type { Surface } from "dumling/types";

export const booksSurface = {
	language: "en",
	normalizedSurface: "books",
	spelling: "Canonical",
	surfaceKind: "Inflection",
	inflectionalFeatures: {
		number: "Plur",
	},
	surfaceFeatures: null,
	lemma: {
		language: "en",
		canonicalForm: "book",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: {
			abbr: null,
			extPos: null,
			foreign: null,
			numForm: null,
			numType: null,
			style: null,
		},
	},
} satisfies Surface<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	order: 40,
	sentenceMarkdown: "The **books** are on the shelf.",
	surface: booksSurface,
} as const;
