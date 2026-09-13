import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "אמא",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "he",
		normalizedSurface: "אמא",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "אימא",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[אמא] התקשרה.",
	classifierNotes:
		'This captures an accepted spelling variant: selected spelling אמא, normalized surface אימא, so `surface.spelling: "Variant"` is the right mark.',
} as const;
