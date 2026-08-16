import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "lachend",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "lachend",
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
			canonicalForm: "lachend",
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
	sentenceMarkdown: "Sie kam [lachend] herein.",
	classifierNotes:
		"Lachend is an adverbially used Partizip I. Under the TIGER boundary in ADR 0007, adjectivally used Partizip I resolves to the participial adjective lachend/ADJ.",
	isVerified: true,
} as const;
