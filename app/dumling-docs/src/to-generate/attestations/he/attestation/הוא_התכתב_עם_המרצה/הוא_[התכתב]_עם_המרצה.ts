import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "התכתב",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "התכתב",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "3",
			tense: "Past",
			voice: "Mid",
			definite: null,
			mood: null,
			polarity: null,
			verbForm: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "כתב",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebBinyan: "HITPAEL",
				hebExistential: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הוא [התכתב] עם המרצה.",
	classifierNotes:
		"התכתב is analyzed as HITPAEL with voice Mid to expose reflexive or reciprocal middle behavior.",
} as const;
