import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "COVID-ish",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "COVID-ish",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "X">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The report says [COVID-ish] twice.",
	classifierNotes:
		"The hybrid nonce token is X with Foreign=Yes because it resists clean POS assignment in isolation.",
} as const;
