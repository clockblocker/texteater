import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Rand",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Rand",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Rand",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Einst ging er an Ufers [Rand]\nmit der Mappe in der Hand.",
	classifierNotes:
		"`Rand` stays citation-shaped here. The attested noun form itself does not overtly distinguish accusative from dative, and this poetic `an Ufers Rand` phrase can be read either as directional movement or as a locative bank-edge setting, so I avoided encoding a guessed case on the surface.",
	classificationMistakes:
		"Do not force a citation-shaped noun into `Surface/Inflection` with guessed case features when the local syntax is genuinely ambiguous. The earlier mistake here was storing `Rand` as accusative singular even though the attested form is syncretic and the phrase also allows a locative reading.",
	isVerified: true,
} as const;
