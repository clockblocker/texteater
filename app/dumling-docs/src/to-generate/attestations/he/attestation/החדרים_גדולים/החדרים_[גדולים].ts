import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "גדולים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "גדולים",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
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
	sentenceMarkdown: "החדרים [גדולים].",
	classifierNotes: "גדולים is a masculine plural adjective inflection.",
} as const;
