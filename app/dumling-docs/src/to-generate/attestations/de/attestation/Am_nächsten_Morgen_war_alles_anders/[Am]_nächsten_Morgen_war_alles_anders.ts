import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Am",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "am",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "am",
			family: "Construction",
			kind: "Fusion",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Am] nächsten Morgen war alles anders.",
	classifierNotes:
		"Am is modeled as Construction/Fusion, parallel to zum and ins. Sentence-initial capitalization is treated as canonical here, and the emoji is for am itself rather than the surrounding temporal phrase.",
	classificationMistakes:
		"Do not mark sentence-initial capitalization alone as a spelling variant. `Am` is a Standard click on a Canonical Surface.",
	isVerified: true,
} as const;
