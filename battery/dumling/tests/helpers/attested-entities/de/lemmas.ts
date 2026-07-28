import type { Lemma } from "../../../../src/types";

// Attestation: "Am Ufer des [Sees] war es still."
export const germanMasculineSeeLemma = {
	canonicalLemma: "See",
	inherentFeatures: {
		gender: "Masc",

		hyph: null,
	},
	language: "de",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	meaningInEmojis: "🏞️",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Kind] schlief schon."
export const germanKindLemma = {
	canonicalLemma: "Kind",
	inherentFeatures: {
		gender: "Neut",

		hyph: null,
	},
	language: "de",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	meaningInEmojis: "👶",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Haus] steht leer."
export const germanHausLemma = {
	canonicalLemma: "Haus",
	inherentFeatures: {
		gender: "Neut",

		hyph: null,
	},
	language: "de",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	meaningInEmojis: "🏠",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Wir [gehen] nach Hause."
export const germanGehenLemma = {
	canonicalLemma: "gehen",
	inherentFeatures: {
		verbType: null,
		lexicallyReflexive: null,
		hasSepPrefix: null,
		hasGovPrep: null,
	},
	language: "de",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "🚶",
} satisfies Lemma<"de", "Lexeme", "VERB">;

// Attestation: "In Berlin ... betreibt die [BVG] die U-Bahn Berlin ..."
export const germanBVGLemma = {
	canonicalLemma: "BVG",
	inherentFeatures: {
		abbr: "Yes",

		gender: null,
		foreign: null,
	},
	language: "de",
	lemmaKind: "Lexeme",
	lemmaSubKind: "PROPN",
	meaningInEmojis: "🚇",
} satisfies Lemma<"de", "Lexeme", "PROPN">;

// Attestation: "[Ab]fahrt nur am Gleis 3."
export const germanAbPrefixLemma = {
	canonicalLemma: "ab",
	inherentFeatures: {
		hasSepPrefix: null,
	},
	language: "de",
	lemmaKind: "Morpheme",
	lemmaSubKind: "Prefix",
	meaningInEmojis: "🧩",
} satisfies Lemma<"de", "Morpheme", "Prefix">;

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallLemma = {
	canonicalLemma: "auf jeden fall",
	inherentFeatures: {
		discourseFormulaRole: "Reaction",
	},
	language: "de",
	lemmaKind: "Phraseme",
	lemmaSubKind: "DiscourseFormula",
	meaningInEmojis: "✅",
} satisfies Lemma<"de", "Phraseme", "DiscourseFormula">;
