import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "נו",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "נו",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "נו",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[נו], תספר כבר.",
	classifierNotes:
		"נו is kept as INTJ rather than a discourse formula because it functions as a prompting interjection.",
} as const;
