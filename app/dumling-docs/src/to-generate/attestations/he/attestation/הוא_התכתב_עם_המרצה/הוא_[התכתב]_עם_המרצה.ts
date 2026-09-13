import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "התכתב",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "התכתב",
		spelling: "Canonical",

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
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הוא [התכתב] עם המרצה.",
	classifierNotes:
		"התכתב is analyzed as HITPAEL with voice Mid to expose reflexive or reciprocal middle behavior.",
} as const;
