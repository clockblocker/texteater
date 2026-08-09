import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "fuhr",
			orthography: "Standard",
		},
		{
			attested: "um",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "fuhr um",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "umfahren",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "um",
				hasGovPrep: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Der Laster [fuhr] das Schild um.",
	classifierNotes:
		"This is discontinuous separable umfahren compressed into the full surface fuhr um; the selected spelling is only the finite verb token.",
	isVerified: true,
} as const;
