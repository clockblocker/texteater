import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ins",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "ins",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "ins",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sie sprang [ins] kalte Wasser.",
	classifierNotes:
		"Ins gets the same Construction/Fusion treatment as zum; the public DTO preserves the fused form intact.",
	isVerified: true,
} as const;
