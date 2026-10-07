import type * as Dumling from "dumling/types";

// Attestation: "הוא [כתב] מכתב."
export const hebrewKatavLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "כתב",
	coreFeatures: {
		hebBinyan: "PAAL",
		hebExistential: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"he", "Lexeme", "VERB">;
