import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "deren",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "deren",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			gender: "Fem",
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
	sentenceMarkdown: "Die Zeugin, [deren] Aussage zählt, bleibt anonym.",
	classifierNotes:
		"Deren is the feminine genitive singular counterpart to dessen in this context.",
	isVerified: true,
} as const;
