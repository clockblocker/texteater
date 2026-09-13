import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "bloody",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "bloody",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "bloody",
			family: "Morpheme",
			kind: "Infix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Morpheme", "Infix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Abso-[bloody]-lutely not.",
	classifierNotes:
		"Expletive insertion is classified as Infix to stress an edge case that is morphologically debatable.",
} as const;
