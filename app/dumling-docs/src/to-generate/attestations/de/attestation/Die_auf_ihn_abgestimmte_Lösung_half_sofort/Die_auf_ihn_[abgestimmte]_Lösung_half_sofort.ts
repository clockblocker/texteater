import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "abgestimmte",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "abgestimmte",
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
			canonicalForm: "abgestimmt",
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
	sentenceMarkdown: "Die auf ihn [abgestimmte] Lösung half sofort.",
	classifierNotes:
		"Abgestimmte is an attributive participial adjective modifying Loesung with nominative feminine singular agreement. The dependent phrase auf ihn stays part of the surrounding attestation context, but the highlighted noun-modifying participle still follows the repo's German rule that attributive participles classify as ADJ rather than VERB.",
	isVerified: true,
} as const;
