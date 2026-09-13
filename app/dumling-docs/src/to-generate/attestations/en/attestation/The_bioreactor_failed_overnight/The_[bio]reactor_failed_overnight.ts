import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "bio",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "bio",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "bio",
			family: "Morpheme",
			kind: "Root",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Morpheme", "Root">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [bio]reactor failed overnight.",
	classifierNotes:
		"Bio is modeled as a bound root in bioreactor, not as a free clipping of biography.",
} as const;
