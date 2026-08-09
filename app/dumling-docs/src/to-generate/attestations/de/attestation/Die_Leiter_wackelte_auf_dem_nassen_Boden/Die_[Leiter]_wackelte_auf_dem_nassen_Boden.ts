import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Leiter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Leiter",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Leiter",
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
	sentenceMarkdown: "Die [Leiter] wackelte auf dem nassen Boden.",
	classifierNotes:
		"The ladder use resolves to the feminine Leiter Lemma, distinct through its Core Features from the masculine person-role Lemma.",
	isVerified: true,
} as const;
