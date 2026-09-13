import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "my bad",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[My bad], I merged the wrong branch.",
	classifierNotes:
		"My bad is categorized by discourse function Apology, not by the adjective bad.",
} as const;
