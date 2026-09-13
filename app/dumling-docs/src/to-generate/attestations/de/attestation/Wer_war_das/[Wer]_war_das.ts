import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Wer",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "wer",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "wer",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Int",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
				referenceNumber: null,
				case: "Nom",
				number: "Sing",
				gender: null,
				"gender[psor]": null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Wer] war das?",
	classifierNotes:
		"Wer is an interrogative pronoun here because it asks for the identity of the referent rather than linking a clause back to an antecedent.",
	isVerified: true,
} as const;
