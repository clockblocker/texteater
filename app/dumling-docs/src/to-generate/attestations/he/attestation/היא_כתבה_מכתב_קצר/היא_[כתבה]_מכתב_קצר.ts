import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "כתבה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "כתבה",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			person: "3",
			tense: "Past",
			definite: null,
			mood: null,
			polarity: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "כתב",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebBinyan: "PAAL",
				hebExistential: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "היא [כתבה] מכתב קצר.",
	classifierNotes:
		"כתבה is the past feminine-singular verb from כתב despite the homographic noun article.",
} as const;
