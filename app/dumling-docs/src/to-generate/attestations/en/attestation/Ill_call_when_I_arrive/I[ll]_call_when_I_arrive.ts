import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ll",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "ll",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "'ll",
			family: "Morpheme",
			kind: "Clitic",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Morpheme", "Clitic">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I'[ll] call when I arrive.",
	classifierNotes:
		'The apostrophe is outside the selected substring, so `surface.spelling: "Variant"` marks the mismatch against the clitic lemma.',
} as const;
