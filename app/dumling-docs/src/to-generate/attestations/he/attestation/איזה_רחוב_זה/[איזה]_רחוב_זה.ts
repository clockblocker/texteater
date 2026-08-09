import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "איזה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "איזה",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			definite: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "איזה",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				pronType: "Int",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[איזה] רחוב זה?",
	classifierNotes:
		"איזה is an interrogative determiner rather than a pronoun because it modifies רחוב.",
} as const;
