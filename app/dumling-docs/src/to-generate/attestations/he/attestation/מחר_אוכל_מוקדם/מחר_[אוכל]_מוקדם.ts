import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "אוכל",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "אוכל",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
			person: "1",
			tense: "Fut",
			definite: null,
			gender: null,
			mood: null,
			polarity: null,
			verbForm: null,
			voice: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "אכל",
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
	sentenceMarkdown: "מחר [אוכל] מוקדם.",
	classifierNotes:
		"אוכל is the future first-person verb from אכל, separated from the noun homograph.",
} as const;
