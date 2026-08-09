import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "בתי",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "בתי",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Cons",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalForm: "בית",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[בתי] הספר נסגרו מוקדם.",
	classifierNotes:
		"בתי is the construct plural of בית, using definite Cons and number Plur.",
} as const;
