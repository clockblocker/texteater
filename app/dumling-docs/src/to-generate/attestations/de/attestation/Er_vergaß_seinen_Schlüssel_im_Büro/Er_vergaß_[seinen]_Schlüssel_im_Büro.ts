import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "seinen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "seinen",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			gender: "Masc",
			number: "Sing",
			"gender[psor]": "Masc",
			"number[psor]": "Sing",
			degree: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				person: "3",
				poss: "Yes",
				pronType: "Prs",
				definite: null,
				extPos: null,
				foreign: null,
				numType: null,
				polite: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er vergaß [seinen] Schlüssel im Büro.",
	classifierNotes:
		"`Seinen` is the accusative masculine singular possessive determiner agreeing with Schlüssel. Here the subject `Er` makes the possessor reading specifically 3rd-person masculine singular, so the separate possessor features are justified.",
	classificationMistakes:
		"Reading belongs to a later layer; Dumling records `seinen` as a possessive determiner Surface.",
	isVerified: true,
} as const;
