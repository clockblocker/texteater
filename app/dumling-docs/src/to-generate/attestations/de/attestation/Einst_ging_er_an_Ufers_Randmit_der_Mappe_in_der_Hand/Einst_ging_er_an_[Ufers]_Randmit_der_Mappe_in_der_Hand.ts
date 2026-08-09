import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Ufers",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Ufers",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Ufer",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Einst ging er an [Ufers] Rand\nmit der Mappe in der Hand.",
	classifierNotes:
		"`Ufers` is genitive singular of `Ufer`. In this poetic noun phrase, the genitive depends on `Rand` (`Ufers Rand`), not directly on the preposition `an`.",
	isVerified: true,
} as const;
