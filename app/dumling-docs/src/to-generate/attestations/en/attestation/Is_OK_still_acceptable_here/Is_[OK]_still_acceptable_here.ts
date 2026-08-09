import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "OK",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "OK",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"en", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Is [OK] still acceptable here?",
	classifierNotes:
		"OK is treated as a standard spelling variant of the canonical lemma okay.",
} as const;
