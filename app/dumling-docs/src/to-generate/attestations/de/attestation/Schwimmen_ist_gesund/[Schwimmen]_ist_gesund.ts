import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Schwimmen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Schwimmen",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Schwimmen",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Schwimmen] ist gesund.",
	classifierNotes:
		"Schwimmen is classified as a substantivized infinitive here, so the selected learner-facing unit is a neuter noun rather than the verb schwimmen. The attested form is already citation-shaped for that nominal reading.",
	isVerified: true,
} as const;
