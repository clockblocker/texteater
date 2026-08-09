import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Struwwelpeter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Struwwelpeter",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Struwwelpeter",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
				foreign: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Sieh einmal, hier steht er, \npfui, der [Struwwelpeter]!",
	classifierNotes:
		"I treated Struwwelpeter as PROPN: der is a stylistic article here, but the referent is still the named character rather than a common noun.",
	isVerified: true,
} as const;
