import type { Lemma } from "../../../../src/types";

// Attestation: "Am Ufer des [Sees] war es still."
export const germanMasculineSeeLemma = {
	canonicalForm: "See",
	coreFeatures: {
		gender: "Masc",

		hyph: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Kind] schlief schon."
export const germanKindLemma = {
	canonicalForm: "Kind",
	coreFeatures: {
		gender: "Neut",

		hyph: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Haus] steht leer."
export const germanHausLemma = {
	canonicalForm: "Haus",
	coreFeatures: {
		gender: "Neut",

		hyph: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Wir [gehen] nach Hause."
export const germanGehenLemma = {
	canonicalForm: "gehen",
	coreFeatures: {
		verbType: null,
		lexicallyReflexive: null,
		hasSepPrefix: null,
		hasGovPrep: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"de", "Lexeme", "VERB">;

// Attestation: "In Berlin ... betreibt die [BVG] die U-Bahn Berlin ..."
export const germanBVGLemma = {
	canonicalForm: "BVG",
	coreFeatures: {
		abbr: "Yes",

		gender: null,
		foreign: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "PROPN",
} satisfies Lemma<"de", "Lexeme", "PROPN">;

// Attestation: "[Ab]fahrt nur am Gleis 3."
export const germanAbPrefixLemma = {
	canonicalForm: "ab",
	coreFeatures: {
		hasSepPrefix: null,
	},
	language: "de",
	family: "Morpheme",
	kind: "Prefix",
} satisfies Lemma<"de", "Morpheme", "Prefix">;

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallLemma = {
	canonicalForm: "auf jeden fall",
	coreFeatures: {
		discourseFormulaRole: "Reaction",
	},
	language: "de",
	family: "Phraseme",
	kind: "DiscourseFormula",
} satisfies Lemma<"de", "Phraseme", "DiscourseFormula">;
