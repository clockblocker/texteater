import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "gewesen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "gewesen",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das wäre schön [gewesen].",
	classifierNotes:
		"Gewesen is treated as an AUX participle rather than a lexical verb.",
	isVerified: true,
} as const;
