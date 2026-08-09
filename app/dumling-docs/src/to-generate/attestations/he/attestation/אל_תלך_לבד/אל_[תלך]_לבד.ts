import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "תלך",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "תלך",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "2",
			polarity: "Neg",
			tense: "Fut",
			definite: null,
			mood: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "הלך",
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
	sentenceMarkdown: "אל [תלך] לבד.",
	classifierNotes:
		"The verb carries polarity Neg because the negative-command context matters even though אל is separate.",
} as const;
