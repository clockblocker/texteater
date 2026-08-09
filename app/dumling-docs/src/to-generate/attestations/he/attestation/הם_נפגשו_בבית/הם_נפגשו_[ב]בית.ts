import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ב",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "ב",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ב",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הם נפגשו [ב]בית.",
	classifierNotes:
		"ב is treated as a prefix morpheme even though it corresponds semantically to a preposition.",
} as const;
