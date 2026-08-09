import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ge",
			orthography: "Standard",
		},
		{
			attested: "t",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "ge t",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "ge-...-t",
			family: "Morpheme",
			kind: "Circumfix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Morpheme", "Circumfix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"In [ge]lacht markieren ge- und -t zusammen das Partizip.",
	classifierNotes:
		"The circumfix is modeled as one morpheme even though the selected spelling shows only its first visible segment.",
	isVerified: true,
} as const;
