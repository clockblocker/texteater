import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "בואו",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "בואו",
		spelling: "Canonical",

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
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[בואו] לכאן.",
	classifierNotes:
		"בואו is an imperative plural form with mood Imp and no tense.",
} as const;
