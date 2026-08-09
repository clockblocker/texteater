import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ll",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "ll",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "'ll",
			family: "Morpheme",
			kind: "Clitic",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Morpheme", "Clitic">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I'[ll] call when I arrive.",
	classifierNotes:
		'The apostrophe is outside the selected substring, so `surface.spelling: "Variant"` marks the mismatch against the clitic lemma.',
} as const;
