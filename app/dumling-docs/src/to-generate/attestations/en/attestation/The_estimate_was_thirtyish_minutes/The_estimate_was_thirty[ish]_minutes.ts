import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ish",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "ish",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "-ish",
			family: "Morpheme",
			kind: "Suffix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Morpheme", "Suffix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The estimate was thirty[ish] minutes.",
	classifierNotes:
		"The suffix citation includes a leading hyphen, while the attested substring omits it.",
} as const;
