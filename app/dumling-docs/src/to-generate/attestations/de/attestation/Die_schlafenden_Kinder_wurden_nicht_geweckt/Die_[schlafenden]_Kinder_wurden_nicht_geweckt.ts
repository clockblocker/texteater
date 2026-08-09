import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "schlafenden",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "schlafenden",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "schlafend",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die [schlafenden] Kinder wurden nicht geweckt.",
	classifierNotes:
		"Schlafenden is an attributive participial adjective modifying Kinder, so this plural nominative agreement form is stored as ADJ rather than as the verb schlafen.",
	isVerified: true,
} as const;
