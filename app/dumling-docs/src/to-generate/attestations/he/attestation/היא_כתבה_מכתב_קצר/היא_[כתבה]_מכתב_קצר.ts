import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "כתבה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "כתבה",
		spelling: "Canonical",

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
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "היא [כתבה] מכתב קצר.",
	classifierNotes:
		"כתבה is the past feminine-singular verb from כתב despite the homographic noun article.",
} as const;
