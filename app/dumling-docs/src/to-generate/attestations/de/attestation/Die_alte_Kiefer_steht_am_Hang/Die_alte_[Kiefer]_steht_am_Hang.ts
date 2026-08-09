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
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die alte [Kiefer] steht am Hang.",
	classifierNotes:
		"The pine-tree use resolves to the feminine Kiefer Lemma, distinct through its Core Features from the masculine jaw Lemma.",
	isVerified: true,
} as const;
