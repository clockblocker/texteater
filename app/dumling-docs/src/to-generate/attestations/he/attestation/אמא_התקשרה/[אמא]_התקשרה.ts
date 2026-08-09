import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "אמא",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "אמא",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"he", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[אמא] התקשרה.",
	classifierNotes:
		'This captures an accepted spelling variant: selected spelling אמא, normalized surface אימא, so `surface.spelling: "Variant"` is the right mark.',
} as const;
