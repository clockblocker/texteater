import type * as Dumling from "dumling/types";

import { hebrewKatavLemma } from "./lemmas";

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuPastThirdPluralInflectionSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: {
		number: "Plur",
		person: "3",
		tense: "Past",
		voice: null,
		verbForm: null,
		polarity: null,
		mood: null,
		gender: null,
		definite: null,
	},
	language: "he",
	normalizedSurface: "כתבו",

	lemma: hebrewKatavLemma,
	surfaceFeatures: null,
	spelling: { kind: "Canonical" },
} satisfies Dumling.Surface<"he", "Lexeme", "VERB">;

// Attestation: "הם [כתבו] מכתב."
export const hebrewKatvuAttestedInflectionSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: {
		number: "Plur",
		person: "3",
		tense: "Past",
		voice: null,
		verbForm: null,
		polarity: null,
		mood: null,
		gender: null,
		definite: null,
	},
	language: "he",
	normalizedSurface: "כתבו",

	lemma: hebrewKatavLemma,
	surfaceFeatures: null,
	spelling: { kind: "Canonical" },
} satisfies Dumling.Surface<"he", "Lexeme", "VERB">;
