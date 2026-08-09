import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "הספרים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "הספרים",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalForm: "ספר",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[הספרים] על השולחן.",
	classifierNotes:
		"This is a full attestation of a definite plural noun surface.",
} as const;
