import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ganze",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "ganze",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Neut",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "ganz",
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
	sentenceMarkdown:
		"Es brennt die Hand, es brennt das Haar,\nes brennt das [ganze] Kind sogar.",
	classifierNotes:
		"Ganze is an attributive adjective modifying Kind. The surface form is syncretic between neuter nominative and accusative singular after das; I chose nominative because in this rhyme das ganze Kind reads as the postposed subject of brennt.",
	isVerified: true,
} as const;
