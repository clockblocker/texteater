import type * as Dumling from "dumling/types";

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
