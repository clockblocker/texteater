import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "he",
		normalizedSurface: "ה",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[ה]בית פתוח.",
	classifierNotes:
		"The standalone article is modeled as DET with pronType Art, not as a noun definiteness feature.",
} as const;
