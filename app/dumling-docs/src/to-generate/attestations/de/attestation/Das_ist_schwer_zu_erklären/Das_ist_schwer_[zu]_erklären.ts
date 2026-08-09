import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "zu",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "zu",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "zu",
			family: "Lexeme",
			kind: "PART",
			coreFeatures: {
				partType: "Inf",
				abbr: null,
				foreign: null,
				polarity: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "PART">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das ist schwer [zu] erklären.",
	classifierNotes:
		"Infinitival zu is PART with partType Inf, distinct from prepositional zu.",
	isVerified: true,
} as const;
