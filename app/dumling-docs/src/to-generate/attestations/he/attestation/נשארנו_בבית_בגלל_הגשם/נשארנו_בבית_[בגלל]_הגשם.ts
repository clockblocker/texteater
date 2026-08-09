import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "בגלל",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "בגלל",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "בגלל",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				abbr: null,
				case: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "נשארנו בבית [בגלל] הגשם.",
	classifierNotes:
		"בגלל is a causal adposition without an additional case feature in the current schema.",
} as const;
