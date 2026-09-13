import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "zum",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "zum",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "zum",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Construction", "Fusion">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er ging [zum] Bahnhof.",
	classifierNotes:
		"Zum is modeled as Construction/Fusion, with the fused form itself as the canonical lemma and citation surface.",
	isVerified: true,
} as const;
