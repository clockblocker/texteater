import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "no worries",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[No worries], I already fixed it.",
	classifierNotes:
		"No worries is a discourse formula rather than compositional negation plus noun.",
} as const;
