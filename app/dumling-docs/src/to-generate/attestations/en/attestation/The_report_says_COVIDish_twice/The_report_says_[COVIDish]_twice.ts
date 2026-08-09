import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "COVID-ish",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "COVID-ish",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "COVID-ish",
			family: "Lexeme",
			kind: "X",
			coreFeatures: {
				foreign: "Yes",
				extPos: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "X">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The report says [COVID-ish] twice.",
	classifierNotes:
		"The hybrid nonce token is X with Foreign=Yes because it resists clean POS assignment in isolation.",
} as const;
