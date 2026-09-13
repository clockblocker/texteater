import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "בתי",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "בתי",
		spelling: "Canonical",

		inflectionalFeatures: {
			definite: "Cons",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[בתי] הספר נסגרו מוקדם.",
	classifierNotes:
		"בתי is the construct plural of בית, using definite Cons and number Plur.",
} as const;
