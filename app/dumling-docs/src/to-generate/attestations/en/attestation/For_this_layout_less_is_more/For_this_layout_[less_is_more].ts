import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "less",
			orthography: "Standard",
		},
		{
			attested: "is",
			orthography: "Standard",
		},
		{
			attested: "more",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "less is more",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "less is more",
			family: "Phraseme",
			kind: "Aphorism",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "Aphorism">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "For this layout, [less is more].",
	classifierNotes:
		"Less is more is treated as an aphorism rather than a proverb because it states a maxim without narrative proverb form.",
} as const;
