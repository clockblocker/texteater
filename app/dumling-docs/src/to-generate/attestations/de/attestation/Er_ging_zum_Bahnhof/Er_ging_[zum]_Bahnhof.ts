import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "zum",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "zum",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "zum",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er ging [zum] Bahnhof.",
	classifierNotes:
		"Zum is modeled as Construction/Fusion, with the fused form itself as the canonical lemma and citation surface.",
	isVerified: true,
} as const;
