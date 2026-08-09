import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "הולכים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "הולכים",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			verbForm: "Part",
			definite: null,
			mood: null,
			person: null,
			polarity: null,
			tense: null,
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
	sentenceMarkdown: "אנחנו [הולכים] עכשיו.",
	classifierNotes:
		"Present-like verbal forms are represented as verbForm Part rather than tense Pres.",
} as const;
