import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "נו",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "נו",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "נו",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "INTJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[נו], תספר כבר.",
	classifierNotes:
		"נו is kept as INTJ rather than a discourse formula because it functions as a prompting interjection.",
} as const;
