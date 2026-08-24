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
				pronType: "Rel",
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
	sentenceMarkdown: "[Wer] zuerst kommt, mahlt zuerst.",
	classifierNotes:
		"Wer heads a free relative clause here, so it is classified as a relative pronoun rather than an interrogative one.",
	isVerified: true,
} as const;
