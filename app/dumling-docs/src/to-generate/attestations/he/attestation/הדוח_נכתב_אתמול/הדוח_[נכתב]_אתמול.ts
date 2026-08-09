import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "נכתב",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "נכתב",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "3",
			tense: "Past",
			voice: "Pass",
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
				hebBinyan: "NIFAL",
				hebExistential: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: 'הדו"ח [נכתב] אתמול.',
	classifierNotes:
		"נכתב is the NIFAL passive-like form, so it carries voice Pass.",
} as const;
