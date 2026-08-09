import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "ה",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ה",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				pronType: "Art",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[ה]בית פתוח.",
	classifierNotes:
		"The standalone article is modeled as DET with pronType Art, not as a noun definiteness feature.",
} as const;
