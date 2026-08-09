import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "בואו",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "בואו",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Plur",
			person: "2",
			definite: null,
			gender: null,
			polarity: null,
			tense: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "בוא",
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
	sentenceMarkdown: "[בואו] לכאן.",
	classifierNotes:
		"בואו is an imperative plural form with mood Imp and no tense.",
} as const;
