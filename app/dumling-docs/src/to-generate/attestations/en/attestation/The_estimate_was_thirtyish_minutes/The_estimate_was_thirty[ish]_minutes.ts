import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ish",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "ish",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "-ish",
			family: "Morpheme",
			kind: "Suffix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Morpheme", "Suffix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The estimate was thirty[ish] minutes.",
	classifierNotes:
		"The suffix citation includes a leading hyphen, while the attested substring omits it.",
} as const;
