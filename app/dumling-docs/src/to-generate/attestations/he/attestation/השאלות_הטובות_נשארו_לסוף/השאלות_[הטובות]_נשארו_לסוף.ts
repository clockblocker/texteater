import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "הטובות",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "הטובות",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			gender: "Fem",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalForm: "טוב",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "השאלות [הטובות] נשארו לסוף.",
	classifierNotes:
		"הטובות is a definite feminine plural adjective surface that preserves article agreement.",
} as const;
