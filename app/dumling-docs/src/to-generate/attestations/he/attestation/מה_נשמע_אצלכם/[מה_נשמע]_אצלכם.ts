import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "מה",
			orthography: "Standard",
		},
		{
			attested: "נשמע",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "מה נשמע",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "מה נשמע",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[מה נשמע] אצלכם?",
	classifierNotes:
		"The multiword greeting is modeled as one discourse-formula surface.",
} as const;
