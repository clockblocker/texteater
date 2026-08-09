import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "בית",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "בית",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			number: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "בית",
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
	sentenceMarkdown: "חזרתי ל[בית].",
	classifierNotes:
		"The Full Attestation preserves the complete normalized Surface בית; the fused prefix outside the member still supplies the contextual definite Def feature.",
} as const;
