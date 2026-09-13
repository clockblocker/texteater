import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "אוכל",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "אוכל",
		spelling: "Canonical",

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
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "מחר [אוכל] מוקדם.",
	classifierNotes:
		"אוכל is the future first-person verb from אכל, separated from the noun homograph.",
} as const;
