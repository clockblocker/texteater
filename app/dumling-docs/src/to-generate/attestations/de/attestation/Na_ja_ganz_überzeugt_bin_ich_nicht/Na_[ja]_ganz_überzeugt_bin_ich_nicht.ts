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
	sentenceMarkdown: "Na [ja], ganz überzeugt bin ich nicht.",
	classifierNotes:
		"The Full Attestation records both members of the discourse formula na ja; the docs review span on ja does not make it a standalone response particle.",
	isVerified: true,
} as const;
