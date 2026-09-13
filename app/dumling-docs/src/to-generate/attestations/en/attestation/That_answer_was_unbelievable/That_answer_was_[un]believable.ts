import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "un",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "un",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "un-",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Morpheme", "Prefix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "That answer was [un]believable.",
	classifierNotes:
		"The attested prefix omits the canonical-form hyphen under a licensed Variant Surface, so the exact member un fully realizes that Surface.",
} as const;
