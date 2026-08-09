import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "כתב",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "כתב",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
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
	sentenceMarkdown: "הוא [כתב] מהר.",
	classifierNotes:
		"כתב is the verb inflection here, distinct from both the root morpheme and noun-like uses.",
} as const;
