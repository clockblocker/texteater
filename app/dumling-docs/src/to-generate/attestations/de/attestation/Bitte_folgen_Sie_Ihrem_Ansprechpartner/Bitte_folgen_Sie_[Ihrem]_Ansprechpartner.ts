import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Ihrem",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Ihrem",
		spelling: "Canonical",
		inflectionalFeatures: {
			case: "Dat",
			gender: "Masc",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Ihr",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: null,
				gender: null,
				number: null,
				person: "2",
				polite: "Form",
				poss: "Yes",
				pronType: "Prs",
				definite: null,
				extPos: null,
				foreign: null,
				numType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Bitte folgen Sie [Ihrem] Ansprechpartner.",
	classifierNotes:
		"The capitalized polite possessive is encoded as DET with person 2, polite Form, and poss Yes.",
	classificationMistakes:
		"Do not add gender[psor] or number[psor] unless the attested form shows them. For polite Ihrem here, the earlier mistake was adding possessor features that are not recoverable from the attestation.",
	isVerified: true,
} as const;
