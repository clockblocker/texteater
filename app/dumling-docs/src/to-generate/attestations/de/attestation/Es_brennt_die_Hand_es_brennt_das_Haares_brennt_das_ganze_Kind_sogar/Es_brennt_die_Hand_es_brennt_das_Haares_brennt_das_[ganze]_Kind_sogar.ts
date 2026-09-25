import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ganze",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "ganze",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Neut",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Es brennt die Hand, es brennt das Haar,\nes brennt das [ganze] Kind sogar.",
	classifierNotes:
		"Ganze is an attributive adjective modifying Kind. The surface form is syncretic between neuter nominative and accusative singular after das; I chose nominative because in this rhyme das ganze Kind reads as the postposed subject of brennt.",
	isVerified: true,
} as const;
