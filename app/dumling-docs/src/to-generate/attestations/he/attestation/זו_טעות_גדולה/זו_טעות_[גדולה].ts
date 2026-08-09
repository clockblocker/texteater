import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "גדולה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "גדולה",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			definite: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "גדול",
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
	sentenceMarkdown: "זו טעות [גדולה].",
	classifierNotes: "גדולה is a feminine singular adjective inflection.",
} as const;
