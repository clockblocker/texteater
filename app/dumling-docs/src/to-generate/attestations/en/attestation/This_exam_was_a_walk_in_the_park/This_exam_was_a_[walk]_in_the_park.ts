import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "walk",
			orthography: "Standard",
		},
		{
			attested: "in",
			orthography: "Standard",
		},
		{
			attested: "the",
			orthography: "Standard",
		},
		{
			attested: "park",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "walk in the park",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "walk in the park",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "This exam was a [walk] in the park.",
} as const;
