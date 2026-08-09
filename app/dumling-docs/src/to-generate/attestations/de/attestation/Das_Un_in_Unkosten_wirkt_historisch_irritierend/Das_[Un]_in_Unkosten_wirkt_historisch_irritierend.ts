import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Un",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Un",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "un-",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {
				hasSepPrefix: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das [Un]- in Unkosten wirkt historisch irritierend.",
	classifierNotes:
		"The bound prefix is represented with the canonical hyphenated lemma un-, while the selected spelling excludes the hyphen.",
	isVerified: true,
} as const;
