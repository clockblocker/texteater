import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Kiefer",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Kiefer",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Kiefer",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Der [Kiefer] schmerzte nach der Operation.",
	classifierNotes:
		"The jaw use resolves to the masculine Kiefer Lemma, distinct through its Core Features from the feminine pine-tree Lemma.",
	isVerified: true,
} as const;
