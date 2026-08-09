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
			gender: "Masc",
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
	sentenceMarkdown: "Der [geschriebene] Brief lag auf dem Tisch.",
	classifierNotes:
		"Geschriebene is an attributive participial adjective modifying Brief with nominative masculine singular agreement. Under the current German rule, attributive participles classify as ADJ here rather than as VERB.",
	isVerified: true,
} as const;
