import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "bewunderte",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "bewunderte",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "bewundert",
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
		"Der von allen [bewunderte] Lehrer ging in den Ruhestand.",
	classifierNotes:
		"Bewunderte is an attributive participial adjective modifying Lehrer with nominative masculine singular agreement. Despite its verbal origin, this noun-modifying participle follows the repo's German rule that attributive participles classify as ADJ rather than VERB.",
	isVerified: true,
} as const;
