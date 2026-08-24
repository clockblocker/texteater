import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "dessen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "dessen",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			gender: "Masc",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "der",
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
	sentenceMarkdown: "Der Autor, [dessen] Buch fehlt, wartet draußen.",
	classifierNotes:
		"Dessen is a genitive relative pronoun with masculine antecedent features from the sentence.",
	isVerified: true,
} as const;
