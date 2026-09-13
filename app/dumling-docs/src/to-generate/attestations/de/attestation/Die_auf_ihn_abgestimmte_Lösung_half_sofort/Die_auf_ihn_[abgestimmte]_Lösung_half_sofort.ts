import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "abgestimmte",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "abgestimmte",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die auf ihn [abgestimmte] Lösung half sofort.",
	classifierNotes:
		"Abgestimmte is an attributive participial adjective modifying Loesung with nominative feminine singular agreement. The dependent phrase auf ihn stays part of the surrounding attestation context, but the highlighted noun-modifying participle still follows the repo's German rule that attributive participles classify as ADJ rather than VERB.",
	isVerified: true,
} as const;
