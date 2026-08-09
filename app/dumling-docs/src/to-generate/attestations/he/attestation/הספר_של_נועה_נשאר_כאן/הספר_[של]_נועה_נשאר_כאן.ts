import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "של",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "של",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "של",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				case: "Gen",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הספר [של] נועה נשאר כאן.",
	classifierNotes: "של is the genitive relation marker here, modeled as ADP.",
} as const;
