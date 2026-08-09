import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "in",
			orthography: "Standard",
		},
		{
			attested: "acht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "in acht",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "in acht nehmen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche hat er mitgebracht\nund nimmt sie sorglich sehr in [acht].",
	classifierNotes:
		"Acht is not the numeral here. It is the internal noun-shaped component of the fixed idiom in acht nehmen, so the attestation points to the whole idiom.",
	isVerified: true,
} as const;
