import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "kicked",
			orthography: "Standard",
		},
		{
			attested: "the",
			orthography: "Standard",
		},
		{
			attested: "bucket",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "kicked the bucket",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "kick the bucket",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The old laptop finally [kicked] the bucket.",
	classifierNotes:
		"The verb is inflected in the sentence, while the idiom resolves to a Citation Surface linked to its Phraseme Lemma.",
} as const;
