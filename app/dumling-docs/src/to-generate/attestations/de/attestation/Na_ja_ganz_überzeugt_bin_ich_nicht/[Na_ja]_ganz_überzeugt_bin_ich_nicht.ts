import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Na",
			orthography: "Standard",
		},
		{
			attested: "ja",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "na ja",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "na ja",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Reaction",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Na ja], ganz überzeugt bin ich nicht.",
	classifierNotes:
		"Na ja is treated as a discourse formula with the role Reaction; punctuation is excluded from the normalized surface.",
} as const;
