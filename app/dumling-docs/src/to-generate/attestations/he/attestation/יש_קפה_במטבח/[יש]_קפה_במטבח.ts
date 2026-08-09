import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "יש",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "יש",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "יש",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebExistential: "Yes",
				hebBinyan: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[יש] קפה במטבח.",
	classifierNotes:
		"יש is modeled as an existential verb, not as an adverb or particle.",
} as const;
