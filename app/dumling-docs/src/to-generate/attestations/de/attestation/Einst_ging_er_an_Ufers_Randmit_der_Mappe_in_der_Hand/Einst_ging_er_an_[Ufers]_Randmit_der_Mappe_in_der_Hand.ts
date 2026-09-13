import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Ufers",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Ufers",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Gen",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Einst ging er an [Ufers] Rand\nmit der Mappe in der Hand.",
	classifierNotes:
		"`Ufers` is genitive singular of `Ufer`. In this poetic noun phrase, the genitive depends on `Rand` (`Ufers Rand`), not directly on the preposition `an`.",
	isVerified: true,
} as const;
