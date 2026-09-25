import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "der",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "der",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "der",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: "Nom",
				gender: "Masc",
				number: "Sing",
				definite: "Def",
				pronType: "Art",
				extPos: null,
				foreign: null,
				numType: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Sieh einmal, hier steht er, \npfui, [der] Struwwelpeter!",
	classifierNotes:
		"This der is the definite article introducing Struwwelpeter, not a standalone pronoun, so it stays DET even though it precedes a name-like label.",
	isVerified: true,
} as const;
