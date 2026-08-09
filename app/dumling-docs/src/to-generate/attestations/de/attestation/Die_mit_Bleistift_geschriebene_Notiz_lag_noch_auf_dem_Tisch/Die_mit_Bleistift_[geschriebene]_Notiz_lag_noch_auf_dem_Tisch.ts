import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "geschriebene",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "geschriebene",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "geschrieben",
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
		"Die mit Bleistift [geschriebene] Notiz lag noch auf dem Tisch.",
	classifierNotes:
		"Geschriebene is an attributive participial adjective modifying Notiz with nominative feminine singular agreement. The surrounding mit Bleistift phrase adds manner/instrument information but does not change the highlight from the adjectival participle classification used here.",
	isVerified: true,
} as const;
