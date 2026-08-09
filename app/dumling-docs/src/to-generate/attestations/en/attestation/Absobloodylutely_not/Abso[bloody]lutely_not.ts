import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "bloody",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "bloody",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "bloody",
			family: "Morpheme",
			kind: "Infix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Morpheme", "Infix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Abso-[bloody]-lutely not.",
	classifierNotes:
		"Expletive insertion is classified as Infix to stress an edge case that is morphologically debatable.",
} as const;
