import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "הספרים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "הספרים",
		spelling: "Canonical",

		inflectionalFeatures: {
			definite: "Def",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[הספרים] על השולחן.",
	classifierNotes:
		"This is a full attestation of a definite plural noun surface.",
} as const;
