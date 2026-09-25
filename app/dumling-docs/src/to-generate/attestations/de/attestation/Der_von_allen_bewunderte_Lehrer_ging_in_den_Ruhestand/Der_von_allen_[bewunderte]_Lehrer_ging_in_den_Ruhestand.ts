import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "bewunderte",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "bewunderte",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Der von allen [bewunderte] Lehrer ging in den Ruhestand.",
	classifierNotes:
		"Bewunderte is an attributive participle modifying Lehrer with nominative masculine singular agreement, so it is the ADJ bewundert with Participle Source bewundern (ADR 0035). The von-agent stays outside.",
	isVerified: true,
} as const;
