import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "nicht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "nicht",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "nicht",
			family: "Lexeme",
			kind: "PART",
			coreFeatures: {
				polarity: "Neg",
				abbr: null,
				foreign: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "PART">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das ist [nicht] mein Problem.",
	classifierNotes:
		"Nicht is modeled as PART with polarity Neg rather than as an adverb.",
	isVerified: true,
} as const;
