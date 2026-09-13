import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ירושלים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ירושלים",
		spelling: "Canonical",

		inflectionalFeatures: {
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ירושלים",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[ירושלים] יפה בלילה.",
	classifierNotes:
		"ירושלים is a proper noun with feminine inherent gender and singular surface number.",
} as const;
