import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "חס",
			orthography: "Standard",
		},
		{
			attested: "וחלילה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "חס וחלילה",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "חס וחלילה",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[חס וחלילה] שנאחר שוב.",
	classifierNotes:
		"חס וחלילה is treated as an idiom because the literal pieces are not the learner-facing meaning.",
} as const;
