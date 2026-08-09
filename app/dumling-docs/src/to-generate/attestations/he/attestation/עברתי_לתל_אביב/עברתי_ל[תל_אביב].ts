import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "תל",
			orthography: "Standard",
		},
		{
			attested: "אביב",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "תל אביב",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "תל אביב",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "עברתי ל[תל אביב].",
	classifierNotes:
		"תל אביב is a multiword proper-noun citation with no additional inflectional surface features.",
} as const;
