import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "בבקשה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "בבקשה",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "בבקשה",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "אפשר מים, [בבקשה]?",
	classifierNotes:
		"בבקשה is treated as a request politeness formula despite containing the noun בקשה.",
} as const;
