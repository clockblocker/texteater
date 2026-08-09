import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "By",
			orthography: "Standard",
		},
		{
			attested: "and",
			orthography: "Standard",
		},
		{
			attested: "large",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "by and large",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "by and large",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[By and large], the migration worked.",
	classifierNotes:
		"Sentence-initial capitalization is preserved only in clicked Text.",
} as const;
