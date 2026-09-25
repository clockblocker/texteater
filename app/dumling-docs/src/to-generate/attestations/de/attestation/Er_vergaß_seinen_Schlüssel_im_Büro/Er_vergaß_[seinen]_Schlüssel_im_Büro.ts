import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "seinen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "seinen",
		spelling: "Canonical",
		inflectionalFeatures: {
			"gender[psor]": "Masc",
			"number[psor]": "Sing",
			degree: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "seinen",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: "Acc",
				gender: "Masc",
				number: "Sing",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er vergaß [seinen] Schlüssel im Büro.",
	classifierNotes:
		"`Seinen` is the accusative masculine singular cell of the possessive determiner, agreeing with Schlüssel. Here the subject `Er` makes the possessor reading specifically 3rd-person masculine singular, so the separate possessor features are justified.",
	classificationMistakes:
		"Reading belongs to a later layer; Dumling records `seinen` as its own possessive determiner Lemma.",
	isVerified: true,
} as const;
