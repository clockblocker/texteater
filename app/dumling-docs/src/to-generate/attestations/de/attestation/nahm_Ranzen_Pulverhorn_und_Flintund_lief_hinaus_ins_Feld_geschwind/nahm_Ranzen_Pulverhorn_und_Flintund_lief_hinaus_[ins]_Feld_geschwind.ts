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
	sentenceMarkdown:
		"nahm Ranzen, Pulverhorn und Flint\nund lief hinaus [ins] Feld geschwind",
	classifierNotes:
		"Ins is the usual German fused form, so Dumling keeps it as Construction/Fusion rather than decomposing it into in + das.",
	isVerified: true,
} as const;
