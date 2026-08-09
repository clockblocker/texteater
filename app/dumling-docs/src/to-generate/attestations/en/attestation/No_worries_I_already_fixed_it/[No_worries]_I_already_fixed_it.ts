import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "No",
			orthography: "Standard",
		},
		{
			attested: "worries",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "no worries",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "no worries",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Acknowledgment",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[No worries], I already fixed it.",
	classifierNotes:
		"No worries is a discourse formula rather than compositional negation plus noun.",
} as const;
