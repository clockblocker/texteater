import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "תלך",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "תלך",
		spelling: "Canonical",

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
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "אל [תלך] לבד.",
	classifierNotes:
		"The verb carries polarity Neg because the negative-command context matters even though אל is separate.",
} as const;
