import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "geschriebene",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "geschriebene",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Der [geschriebene] Brief lag auf dem Tisch.",
	classifierNotes:
		"Geschriebene is an attributive participle modifying Brief with nominative masculine singular agreement, so it is the ADJ geschrieben with Participle Source schreiben (ADR 0036).",
	isVerified: true,
} as const;
