import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "zu",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "zu",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "PART">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das ist schwer [zu] erklären.",
	classifierNotes:
		"Infinitival zu is PART with partType Inf, distinct from prepositional zu.",
	isVerified: true,
} as const;
