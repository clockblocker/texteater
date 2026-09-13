import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "הולכים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "הולכים",
		spelling: "Canonical",

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
	sentenceMarkdown: "אנחנו [הולכים] עכשיו.",
	classifierNotes:
		"Present-like verbal forms are represented as verbForm Part rather than tense Pres.",
} as const;
