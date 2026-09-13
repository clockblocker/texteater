import type * as Dumling from "dumling/types";

// Attestation: "Am Ufer des [Sees] war es still."
export const germanMasculineSeeLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "See",
	coreFeatures: {
		gender: "Masc",
		hyph: null,
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
		hyph: null,
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
		hyph: null,
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
		verbType: null,
		lexicallyReflexive: null,
		hasSepPrefix: null,
		hasGovPrep: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"de", "Lexeme", "VERB">;

// Attestation: "In Berlin sowie im Umland (Agglomeration Berlin) betreibt die [BVG] die U-Bahn Berlin, die Straßenbahn Berlin, den Busverkehr in Berlin und den Fährverkehr in Berlin, nicht jedoch die S-Bahn."
// UD-style: multi-word abbreviations keep the abbreviated form as canonicalForm and mark Abbr=Yes.
// See https://universaldependencies.org/u/overview/morphology.html
// We intentionally do not model a built-in link from "BVG" to "Berliner Verkehrsbetriebe" here.
export const germanBVGLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "BVG",
	coreFeatures: {
		abbr: "Yes",
		gender: null,
		foreign: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "PROPN",
} satisfies Dumling.Lemma<"de", "Lexeme", "PROPN">;

// Attestation: "Ich komme [auf jeden Fall] morgen."
export const germanAufJedenFallLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "auf jeden Fall",
	coreFeatures: { discourseFormulaRole: "Reaction" },
	language: "de",
	family: "Phraseme",
	kind: "DiscourseFormula",
} satisfies Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">;

// Attestation: "[Ab]fahrt nur am Gleis 3."
export const germanAbPrefixLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "ab",
	coreFeatures: { hasSepPrefix: null },
	language: "de",
	family: "Morpheme",
	kind: "Prefix",
} satisfies Dumling.Lemma<"de", "Morpheme", "Prefix">;
