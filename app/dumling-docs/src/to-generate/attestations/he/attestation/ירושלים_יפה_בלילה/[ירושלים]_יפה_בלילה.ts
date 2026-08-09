import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ירושלים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "ירושלים",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
		},
		lemma: {
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
} satisfies Attestation<"he", "Inflection", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[ירושלים] יפה בלילה.",
	classifierNotes:
		"ירושלים is a proper noun with feminine inherent gender and singular surface number.",
} as const;
