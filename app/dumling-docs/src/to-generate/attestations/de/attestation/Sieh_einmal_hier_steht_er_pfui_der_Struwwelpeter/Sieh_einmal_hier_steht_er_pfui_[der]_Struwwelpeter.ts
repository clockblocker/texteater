import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "der",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "der",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			language: "de",
			canonicalForm: "der",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Sieh einmal, hier steht er, \npfui, [der] Struwwelpeter!",
	classifierNotes:
		"This der is the definite article introducing Struwwelpeter, not a standalone pronoun, so it stays DET even though it precedes a name-like label.",
	isVerified: true,
} as const;
