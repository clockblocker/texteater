import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "שלום",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "שלום",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "שלום",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[שלום], מה שלומך?",
	classifierNotes:
		"שלום is treated as a discourse formula rather than as the noun peace because the sentence is a greeting.",
} as const;
