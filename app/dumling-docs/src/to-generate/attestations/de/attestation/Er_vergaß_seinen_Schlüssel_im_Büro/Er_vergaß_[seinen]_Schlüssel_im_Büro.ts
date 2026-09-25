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
			case: "Acc",
			gender: "Masc",
			number: "Sing",
			"gender[psor]": ["Masc", "Neut"],
			"number[psor]": "Sing",
			degree: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: null,
				gender: null,
				number: null,
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
		"`Seinen` is the accusative masculine singular Surface of the possessive determiner sein, agreeing with Schlüssel. Its possessor features record what the form shows: sein- serves a masculine or neuter singular possessor, so gender[psor] is the set Masc, Neut even though the subject `Er` is masculine.",
	classificationMistakes:
		"Reading belongs to a later layer; Dumling records `seinen` as a Surface of the possessive determiner Lemma sein.",
	isVerified: true,
} as const;
