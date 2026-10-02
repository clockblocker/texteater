import type * as Dumling from "dumling/types";

// Attestation: "Am Ufer des [Sees] war es still."
export const germanMasculineSeeLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "See",
	coreFeatures: {
		gender: "Masc",
	},
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Kind] schlief schon."
export const germanKindLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "Kind",
	coreFeatures: {
		gender: "Neut",
	},
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Das [Haus] steht leer."
export const germanHausLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "Haus",
	coreFeatures: {
		gender: "Neut",
	},
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
} satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;

// Attestation: "Wir [gehen] nach Hause."
export const germanGehenLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "gehen",
	coreFeatures: {
		lexicallyReflexive: null,
		hasSepPrefix: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"de", "Lexeme", "VERB">;

// Attestation: "In Berlin sowie im Umland (Agglomeration Berlin) betreibt die [BVG] die U-Bahn Berlin, die Straßenbahn Berlin, den Busverkehr in Berlin und den Fährverkehr in Berlin, nicht jedoch die S-Bahn."
// The abbreviation is its own Lemma, because the text uses the letters as the
// name; German records no Abbr (ADR 0032, amended 2026-10-01). How it expands
// to "Berliner Verkehrsbetriebe" is a relation, not identity, so no link is
// modelled here.
export const germanBVGLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "BVG",
	coreFeatures: {
		article: null,
		gender: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "PROPN",
} satisfies Dumling.Lemma<"de", "Lexeme", "PROPN">;

// Attestation: "Ich komme [auf jeden Fall] morgen."
// A fixed adverbial whose whole acts as an adverb: a Locution ADV with no
// comparison forms (ADR 0039, ADR 0042).
export const germanAufJedenFallLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "auf jeden Fall",
	coreFeatures: { comparable: null },
	language: "de",
	family: "Locution",
	kind: "ADV",
} satisfies Dumling.Lemma<"de", "Locution", "ADV">;

// Attestation: "[Ab]fahrt nur am Gleis 3."
export const germanAbPrefixLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "ab",
	coreFeatures: { hasSepPrefix: null },
	language: "de",
	family: "Morpheme",
	kind: "Prefix",
} satisfies Dumling.Lemma<"de", "Morpheme", "Prefix">;
