import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "bio",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "bio",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "bio",
			family: "Morpheme",
			kind: "Root",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Morpheme", "Root">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [bio]reactor failed overnight.",
	classifierNotes:
		"Bio is modeled as a bound root in bioreactor, not as a free clipping of biography.",
} as const;
