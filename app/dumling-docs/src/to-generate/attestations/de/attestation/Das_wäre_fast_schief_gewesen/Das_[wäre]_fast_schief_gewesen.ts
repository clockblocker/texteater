import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "wäre",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "wäre",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Sub",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
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
	sentenceMarkdown: "Das [wäre] fast schief gewesen.",
	classifierNotes:
		"The Konjunktiv-II form is mapped to supported mood Sub plus past tense.",
	isVerified: true,
} as const;
