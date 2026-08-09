import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "אוכל",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "אוכל",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "אוכל",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "ה[אוכל] כבר מוכן.",
	classifierNotes:
		"אוכל is the noun food here, separated from the future-verb homograph by lemma and POS.",
} as const;
