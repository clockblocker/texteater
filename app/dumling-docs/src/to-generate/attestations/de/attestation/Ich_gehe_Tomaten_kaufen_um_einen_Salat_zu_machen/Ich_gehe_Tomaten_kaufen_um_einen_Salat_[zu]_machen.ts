import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "um",
			orthography: "Standard",
		},
		{
			attested: "zu",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "um zu",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "um zu",
			family: "Construction",
			kind: "PairedFrame",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Construction", "PairedFrame">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Ich gehe Tomaten kaufen, um einen Salat [zu] machen.",
	classifierNotes:
		"The Full Attestation records both members of the learner-facing Construction/PairedFrame `um zu`; the docs-owned review span remains on `zu`, outside the Dumling DTO.",
} as const;
