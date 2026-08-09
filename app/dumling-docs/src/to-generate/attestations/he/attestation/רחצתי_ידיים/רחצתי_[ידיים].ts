import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ידיים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "ידיים",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Dual",
			definite: null,
		},
		lemma: {
			language: "he",
			canonicalForm: "יד",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "רחצתי [ידיים].",
	classifierNotes: "ידיים is a dual-number surface for a paired body part.",
} as const;
