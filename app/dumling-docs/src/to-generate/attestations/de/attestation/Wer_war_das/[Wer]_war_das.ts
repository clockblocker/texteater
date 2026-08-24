import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Wer",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "wer",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
			gender: null,
			reflex: null,
		},
		lemma: {
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
				referenceGender: null,
				referenceNumber: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Wer] war das?",
	classifierNotes:
		"Wer is an interrogative pronoun here because it asks for the identity of the referent rather than linking a clause back to an antecedent.",
	isVerified: true,
} as const;
