import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "kicked the bucket",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "kick the bucket",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The old laptop finally [kicked] the bucket.",
	classifierNotes:
		"The verb is inflected in the sentence, while the idiom resolves to a Citation Surface linked to its Phraseme Lemma.",
} as const;
