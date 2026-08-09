import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "mal",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "mal",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "einmal",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sieh [mal] an, die Kleine von nebenan.",
	classifierNotes:
		"I treated mal as the colloquial reduced variant of adverb einmal. Even in the semi-formulaic frame sieh mal an, the learner-facing selected unit is still the standalone adverb rather than a larger discourse formula.",
} as const;
