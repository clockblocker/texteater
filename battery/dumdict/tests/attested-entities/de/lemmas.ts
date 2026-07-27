import type { Lemma } from "../../../src";

// Attestation: "Am Ufer des [Sees] war es still."
export const germanMasculineSeeLemma = {
	canonicalLemma: "See",
	inherentFeatures: {
		gender: "Masc",
	},
	language: "de",
	lemmaKind: "Lexeme",
	meaningInEmojis: "🏞️",
	lemmaSubKind: "NOUN",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Kind] schlief schon."
export const germanKindLemma = {
	canonicalLemma: "Kind",
	inherentFeatures: {
		gender: "Neut",
	},
	language: "de",
	lemmaKind: "Lexeme",
	meaningInEmojis: "👶",
	lemmaSubKind: "NOUN",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Haus] steht leer."
export const germanHausLemma = {
	canonicalLemma: "Haus",
	inherentFeatures: {
		gender: "Neut",
	},
	language: "de",
	lemmaKind: "Lexeme",
	meaningInEmojis: "🏠",
	lemmaSubKind: "NOUN",
} satisfies Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Wir [gehen] nach Hause."
export const germanGehenLemma = {
	canonicalLemma: "gehen",
	inherentFeatures: {},
	language: "de",
	lemmaKind: "Lexeme",
	meaningInEmojis: "🚶",
	lemmaSubKind: "VERB",
} satisfies Lemma<"de", "Lexeme", "VERB">;

// Attestation: "In Berlin sowie im Umland (Agglomeration Berlin) betreibt die [BVG] die U-Bahn Berlin, die Straßenbahn Berlin, den Busverkehr in Berlin und den Fährverkehr in Berlin, nicht jedoch die S-Bahn."
// UD-style: multi-word abbreviations keep the abbreviated form as canonicalLemma and mark Abbr=Yes.
// See https://universaldependencies.org/u/overview/morphology.html
// We intentionally do not model a built-in link from "BVG" to "Berliner Verkehrsbetriebe" here.
export const germanBVGLemma = {
	canonicalLemma: "BVG",
	inherentFeatures: {
		abbr: "Yes",
	},
	language: "de",
	lemmaKind: "Lexeme",
	meaningInEmojis: "🚇",
	lemmaSubKind: "PROPN",
} satisfies Lemma<"de", "Lexeme", "PROPN">;

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallLemma = {
	canonicalLemma: "auf jeden Fall",
	inherentFeatures: {},
	language: "de",
	lemmaKind: "Phraseme",
	meaningInEmojis: "✅",
	lemmaSubKind: "DiscourseFormula",
} satisfies Lemma<"de", "Phraseme", "DiscourseFormula">;

// Attestation: "[Ab]fahrt nur am Gleis 3."
export const germanAbPrefixLemma = {
	canonicalLemma: "ab",
	inherentFeatures: {},
	language: "de",
	lemmaKind: "Morpheme",
	meaningInEmojis: "🧩",
	lemmaSubKind: "Prefix",
} satisfies Lemma<"de", "Morpheme", "Prefix">;
