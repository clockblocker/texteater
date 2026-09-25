import type * as Dumling from "dumling/types";

export const booksSurface = {
	unitKind: "Surface",
	language: "en",
	normalizedSurface: "books",
	spelling: "Canonical",

	inflectionalFeatures: {
		article: "Definite",
		number: "Plur",
	},
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
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
} satisfies Dumling.Surface<"en", "Lexeme", "NOUN">;

export const attestation = {
	order: 40,
	sentenceMarkdown: "The **books** are on the shelf.",
	surface: booksSurface,
} as const;
