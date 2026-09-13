import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "OK",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "OK",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "okay",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				polarity: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "INTJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Is [OK] still acceptable here?",
	classifierNotes:
		"OK is treated as a standard spelling variant of the canonical lemma okay.",
} as const;
