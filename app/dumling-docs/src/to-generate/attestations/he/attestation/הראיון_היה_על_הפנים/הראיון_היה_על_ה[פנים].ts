import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "פנים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "פנים",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "על הפנים",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הראיון היה על ה[פנים].",
	classifierNotes:
		"The Full Attestation preserves the complete normalized Surface פנים, which resolves to the idiom Lemma על הפנים rather than a noun Lemma.",
} as const;
