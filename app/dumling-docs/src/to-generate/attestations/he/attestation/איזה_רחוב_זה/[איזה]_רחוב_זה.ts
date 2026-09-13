import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "איזה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "איזה",
		spelling: "Canonical",

		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			definite: null,
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[איזה] רחוב זה?",
	classifierNotes:
		"איזה is an interrogative determiner rather than a pronoun because it modifies רחוב.",
} as const;
