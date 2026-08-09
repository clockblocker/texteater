import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ש",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "ש",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ש",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "אמרת [ש]תבוא.",
	classifierNotes:
		"ש is modeled as the bound complementizer or relative-marker prefix morpheme.",
} as const;
