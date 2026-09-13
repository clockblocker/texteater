import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Struwwelpeter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "Struwwelpeter",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Sieh einmal, hier steht er, \npfui, der [Struwwelpeter]!",
	classifierNotes:
		"I treated Struwwelpeter as PROPN: der is a stylistic article here, but the referent is still the named character rather than a common noun.",
	isVerified: true,
} as const;
