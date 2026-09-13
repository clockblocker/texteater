import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "mal",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "mal",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sieh [mal] an, die Kleine von nebenan.",
	classifierNotes:
		"I treated mal as the colloquial reduced variant of adverb einmal. Even in the semi-formulaic frame sieh mal an, the learner-facing selected unit is still the standalone adverb rather than a larger discourse formula.",
} as const;
