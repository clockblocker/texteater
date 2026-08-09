import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "My",
			orthography: "Standard",
		},
		{
			attested: "bad",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "my bad",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "my bad",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Apology",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[My bad], I merged the wrong branch.",
	classifierNotes:
		"My bad is categorized by discourse function Apology, not by the adjective bad.",
} as const;
