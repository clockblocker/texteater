import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "un",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "un",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "un-",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "That answer was [un]believable.",
	classifierNotes:
		"The attested prefix omits the canonical-form hyphen under a licensed Variant Surface, so the exact member un fully realizes that Surface.",
} as const;
