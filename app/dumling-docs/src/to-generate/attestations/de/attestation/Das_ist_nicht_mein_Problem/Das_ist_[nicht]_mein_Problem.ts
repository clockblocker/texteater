import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "nicht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "nicht",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "PART">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das ist [nicht] mein Problem.",
	classifierNotes:
		"Nicht is modeled as PART with polarity Neg rather than as an adverb.",
	isVerified: true,
} as const;
