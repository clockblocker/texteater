import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "schweigend",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "schweigend",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: null,
			degree: "Pos",
			gender: null,
			number: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "schweigend",
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
	sentenceMarkdown: "Er saß [schweigend] am Fenster.",
	classifierNotes:
		"Schweigend is an adverbially used Partizip I. Under the TIGER boundary in ADR 0007, adjectivally used Partizip I resolves to the participial adjective schweigend/ADJ.",
	isVerified: true,
} as const;
