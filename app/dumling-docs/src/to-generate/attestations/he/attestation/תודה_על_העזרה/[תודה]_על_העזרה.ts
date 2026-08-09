import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "תודה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "תודה",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "תודה",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[תודה] על העזרה.",
	classifierNotes:
		"תודה is treated as a thanks formula rather than as a standalone noun.",
} as const;
